import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

export default function InterviewRoom() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const answerRef = useRef('');

  const [user, setUser] = useState(null);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');

  const [cameraActive, setCameraActive] = useState(false);

  const [proctorStatus, setProctorStatus] = useState(
    'Checking camera...'
  );

  const [isWarning, setIsWarning] = useState(false);

  // NEW:
  // Stores the actual proctoring alert returned by the backend.
  const [proctorAlert, setProctorAlert] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }

    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      navigate('/student-login');
      return;
    }

    let parsedUser;

    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('user');
      navigate('/student-login');
      return;
    }

    if (parsedUser.role !== 'student') {
      navigate('/officer-login');
      return;
    }

    setUser(parsedUser);

    startInterview(parsedUser.id);

    return () => {
      stopRecognition();
      stopCamera();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!loading && !completed) {
      const timer = setInterval(() => {
        setTimeLeft((previous) => {
          if (previous <= 1) {
            clearInterval(timer);
            return 0;
          }

          return previous - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, completed]);

  useEffect(() => {
    if (
      timeLeft === 0 &&
      !completed &&
      !submitting
    ) {
      submitVoiceAnswer();
    }
  }, [timeLeft]);

  const startInterview = async (userId) => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/api/interview/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to start interview'
        );
      }

      const firstQuestion =
        data.question ||
        data.next_question ||
        '';

      setQuestion(firstQuestion);

      setQuestionNumber(
        data.question_number ||
        data.current_question ||
        1
      );

      setTotalQuestions(
        data.total_questions ||
        data.total ||
        5
      );

      await startCamera(userId);

      setTimeout(() => {
        speakQuestion(firstQuestion);
      }, 700);
    } catch (err) {
      setError(
        err.message ||
        'Unable to start interview'
      );
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (userId) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraActive(true);
      setProctorStatus('Monitoring active');
      setIsWarning(false);
      setProctorAlert(null);

      startProctoring(userId);
    } catch (err) {
      console.error('Camera error:', err);

      setCameraActive(false);
      setProctorStatus('Camera unavailable');
      setIsWarning(true);

      setProctorAlert({
        type: 'camera',
        message:
          err.message ||
          'Camera access is unavailable. Please allow camera access.'
      });
    }
  };

  const stopCamera = () => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
      proctorIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    setCameraActive(false);
  };

  const startProctoring = (userId) => {
    if (proctorIntervalRef.current) {
      clearInterval(proctorIntervalRef.current);
    }

    // Send one frame immediately.
    setTimeout(() => {
      sendProctorFrame(userId);
    }, 1000);

    // Then continue every 5 seconds.
    proctorIntervalRef.current =
      setInterval(() => {
        sendProctorFrame(userId);
      }, 5000);
  };

  const sendProctorFrame = async (userId) => {
    if (
      !videoRef.current ||
      !userId ||
      submitting ||
      completed
    ) {
      return;
    }

    if (
      !videoRef.current.videoWidth ||
      !videoRef.current.videoHeight
    ) {
      return;
    }

    try {
      const canvas =
        document.createElement('canvas');

      canvas.width =
        videoRef.current.videoWidth;

      canvas.height =
        videoRef.current.videoHeight;

      const context =
        canvas.getContext('2d');

      if (!context) {
        return;
      }

      context.drawImage(
        videoRef.current,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Convert camera frame into JPEG blob.
      const blob = await new Promise(
        (resolve) => {
          canvas.toBlob(
            resolve,
            'image/jpeg',
            0.7
          );
        }
      );

      if (!blob) {
        console.error(
          'Unable to create camera frame.'
        );
        return;
      }

      /*
       * IMPORTANT:
       *
       * The backend expects:
       *
       * user_id -> Form field
       * frame   -> uploaded JPEG file
       *
       * Therefore we use FormData.
       *
       * DO NOT manually set Content-Type.
       * Browser automatically creates the multipart boundary.
       */
      const formData = new FormData();

      formData.append(
        'user_id',
        String(userId)
      );

      formData.append(
        'frame',
        blob,
        'frame.jpg'
      );

      const response = await fetch(
        `${API_URL}/api/proctor-frame`,
        {
          method: 'POST',
          body: formData
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.message ||
          'Proctoring request failed'
        );
      }

      /*
       * The backend can return:
       *
       * alert
       * alert_type
       * message
       * warning
       * violations
       * phone_detected
       * face_count
       * person_count
       */

      const violations =
        Array.isArray(data.violations)
          ? data.violations
          : [];

      let warningMessage =
        data.message ||
        data.warning ||
        '';

      /*
       * If the backend sends violations
       * but no message, create a readable
       * message here.
       */
      if (
        !warningMessage &&
        violations.length > 0
      ) {
        warningMessage =
          violations.join(' | ');
      }

      /*
       * Handle phone detection even if
       * backend didn't set alert=true.
       */
      if (
        !warningMessage &&
        data.phone_detected
      ) {
        warningMessage =
          'Phone detected. Please keep your phone away from the interview area.';
      }

      /*
       * Handle multiple faces even if
       * backend didn't explicitly set alert=true.
       */
      if (
        !warningMessage &&
        Number(data.face_count) > 1
      ) {
        warningMessage =
          `Multiple people detected (${data.face_count} faces). Please remain alone during the interview.`;
      }

      /*
       * Handle backend alert.
       */
      if (
        data.alert ||
        warningMessage ||
        violations.length > 0 ||
        data.phone_detected
      ) {
        const message =
          warningMessage ||
          'Proctoring warning detected.';

        setProctorAlert({
          type:
            data.alert_type ||
            'proctoring_warning',
          message
        });

        setProctorStatus(message);
        setIsWarning(true);

        return;
      }

      /*
       * No violation.
       */
      setProctorAlert(null);
      setProctorStatus('Monitoring active');
      setIsWarning(false);
    } catch (err) {
      console.error(
        'Proctoring request error:',
        err
      );

      /*
       * IMPORTANT:
       *
       * Do NOT say "Monitoring active"
       * when the request actually failed.
       */
      setProctorStatus(
        'Proctoring connection error'
      );

      setIsWarning(true);

      setProctorAlert({
        type: 'connection_error',
        message:
          err.message ||
          'Unable to communicate with the proctoring service.'
      });
    }
  };

  const speakQuestion = (text) => {
    if (
      !text ||
      !window.speechSynthesis
    ) {
      return;
    }

    stopRecognition();

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    speech.onstart = () => {
      setIsSpeaking(true);
    };

    speech.onend = () => {
      setIsSpeaking(false);
    };

    speech.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      setError(
        'Voice recognition is not supported in this browser. Please use Google Chrome.'
      );
      return;
    }

    if (submitting || completed) {
      return;
    }

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setError('');

    stopRecognition();

    const recognition =
      new SpeechRecognition();

    recognitionRef.current =
      recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalText = '';

    recognition.onstart = () => {
      setIsListening(true);

      if (!isWarning) {
        setProctorStatus(
          'Monitoring active'
        );
      }
    };

    recognition.onresult = (event) => {
      let interimText = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const result =
          event.results[i];

        const text =
          result[0].transcript;

        if (result.isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text;
        }
      }

      const combined =
        `${finalText}${interimText}`.trim();

      answerRef.current = combined;

      setAnswer(combined);
      setTranscript(combined);
    };

    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed'
      ) {
        setError(
          'Microphone permission was denied. Please allow microphone access.'
        );
      } else if (
        event.error === 'no-speech'
      ) {
        setError(
          'No speech detected. Please try speaking again.'
        );
      } else if (
        event.error !== 'aborted'
      ) {
        setError(
          'Voice recognition encountered an error.'
        );
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error(
        'Speech recognition start error:',
        err
      );

      setIsListening(false);
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition may already be stopped.
      }

      recognitionRef.current = null;
    }

    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecognition();
    } else {
      startListening();
    }
  };

  const submitVoiceAnswer = async () => {
    if (submitting || completed) {
      return;
    }

    stopRecognition();

    window.speechSynthesis.cancel();

    setIsSpeaking(false);

    const finalAnswer =
      answerRef.current.trim();

    if (!finalAnswer) {
      setError(
        'Please answer the question using your microphone.'
      );
      return;
    }

    setSubmitting(true);
    setError('');

    if (proctorIntervalRef.current) {
      clearInterval(
        proctorIntervalRef.current
      );

      proctorIntervalRef.current = null;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/api/interview/answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              user_id: user.id,
              question,
              answer: finalAnswer
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          'Unable to submit answer'
        );
      }

      const nextQuestion =
        data.question ||
        data.next_question;

      if (
        data.completed ||
        data.status === 'completed' ||
        !nextQuestion
      ) {
        setCompleted(true);

        stopCamera();

        await finishInterview();

        return;
      }

      setQuestion(nextQuestion);

      setQuestionNumber(
        data.question_number ||
        data.next_question_number ||
        questionNumber + 1
      );

      answerRef.current = '';

      setAnswer('');
      setTranscript('');

      setSubmitting(false);

      if (streamRef.current) {
        startProctoring(user.id);
      }

      setTimeout(() => {
        speakQuestion(nextQuestion);
      }, 400);
    } catch (err) {
      setError(
        err.message ||
        'Something went wrong while submitting your answer.'
      );

      setSubmitting(false);

      if (streamRef.current) {
        startProctoring(user.id);
      }
    }
  };

  const finishInterview = async () => {
    try {
      await fetch(
        `${API_URL}/api/interview/finish`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            user_id: user.id
          })
        }
      );
    } catch {
      // Interview is already completed.
    }
  };

  const formatTime = (seconds) => {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${String(minutes).padStart(
      2,
      '0'
    )}:${String(
      remainingSeconds
    ).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingLogo}>
            C
          </div>

          <h2 style={styles.loadingTitle}>
            Preparing your AI interview
          </h2>

          <p style={styles.loadingText}>
            Setting up your camera,
            microphone and AI interviewer...
          </p>

          <div style={styles.loader} />
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={styles.completePage}>
        <div style={styles.completeCard}>
          <div style={styles.completeIcon}>
            ✓
          </div>

          <div style={styles.completeLabel}>
            INTERVIEW COMPLETED
          </div>

          <h1 style={styles.completeTitle}>
            Well done.
          </h1>

          <p style={styles.completeText}>
            Your voice interview has been
            submitted successfully. Your
            responses have been evaluated
            and your result is now available.
          </p>

          <button
            style={styles.primaryButton}
            onClick={() =>
              navigate('/student-results')
            }
          >
            View my results →
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() =>
              navigate('/student-dashboard')
            }
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const progress =
    totalQuestions > 0
      ? (questionNumber /
          totalQuestions) *
        100
      : 0;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div
            style={styles.logoArea}
            onClick={() =>
              navigate(
                '/student-dashboard'
              )
            }
          >
            <div style={styles.logo}>
              C
            </div>

            <div>
              <div style={styles.brand}>
                Campus
              </div>

              <div style={styles.brandSub}>
                to Career
              </div>
            </div>
          </div>

          <div style={styles.headerCenter}>
            <span style={styles.headerLabel}>
              LIVE AI INTERVIEW
            </span>

            <strong>
              Question {questionNumber} of{' '}
              {totalQuestions}
            </strong>
          </div>

          <div style={styles.timer}>
            <span style={styles.timerSpan}>
              TIME LEFT
            </span>

            <strong style={styles.timerStrong}>
              {formatTime(timeLeft)}
            </strong>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.topRow}>
          <div>
            <div style={styles.pageEyebrow}>
              LIVE VOICE INTERVIEW
            </div>

            <h1 style={styles.heading}>
              Speak naturally.
            </h1>

            <p style={styles.description}>
              The AI interviewer will ask you
              questions aloud. Answer using
              your microphone.
            </p>
          </div>

          <div style={styles.progressBox}>
            <div style={styles.progressText}>
              <span>PROGRESS</span>

              <strong>
                {questionNumber}/
                {totalQuestions}
              </strong>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress}%`
                }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {!speechSupported && (
          <div style={styles.browserWarning}>
            Voice interview requires speech
            recognition. Please use Google
            Chrome for the best experience.
          </div>
        )}

        <div style={styles.interviewGrid}>
          <section>
            <div style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <div>
                  <span style={styles.questionLabel}>
                    AI INTERVIEWER
                  </span>

                  <div
                    style={
                      styles.speakingStatus
                    }
                  >
                    <span
                      style={{
                        ...styles.audioDot,
                        background:
                          isSpeaking
                            ? '#d7b86a'
                            : '#63818c'
                      }}
                    />

                    {isSpeaking
                      ? 'Speaking...'
                      : 'Ready for your answer'}
                  </div>
                </div>

                <button
                  style={styles.replayButton}
                  onClick={() =>
                    speakQuestion(question)
                  }
                >
                  🔊 Replay question
                </button>
              </div>

              <div style={styles.questionBubble}>
                <div style={styles.quote}>
                  “
                </div>

                <h2 style={styles.question}>
                  {question}
                </h2>
              </div>

              <div style={styles.answerArea}>
                <div style={styles.answerHeader}>
                  <span>
                    YOUR RESPONSE
                  </span>

                  <span>
                    {isListening
                      ? '● Listening'
                      : 'Microphone ready'}
                  </span>
                </div>

                <div
                  style={{
                    ...styles.transcriptBox,
                    borderColor:
                      isListening
                        ? '#315d6e'
                        : '#d7d0c5'
                  }}
                >
                  {transcript ? (
                    <span>
                      {transcript}
                    </span>
                  ) : (
                    <span
                      style={
                        styles.placeholder
                      }
                    >
                      Your spoken answer will
                      appear here...
                    </span>
                  )}
                </div>

                <div style={styles.voiceControls}>
                  <button
                    onClick={
                      toggleListening
                    }
                    disabled={
                      submitting ||
                      !speechSupported
                    }
                    style={{
                      ...styles.micButton,
                      background:
                        isListening
                          ? '#a94d45'
                          : '#17394b',
                      opacity:
                        submitting ||
                        !speechSupported
                          ? 0.5
                          : 1,
                      cursor:
                        submitting ||
                        !speechSupported
                          ? 'not-allowed'
                          : 'pointer'
                    }}
                  >
                    <span
                      style={
                        styles.micIcon
                      }
                    >
                      {isListening
                        ? '■'
                        : '🎤'}
                    </span>

                    {isListening
                      ? 'Stop recording'
                      : 'Start speaking'}
                  </button>

                  <div style={styles.voiceHint}>
                    {isListening
                      ? 'Speak clearly. Your response is being transcribed.'
                      : 'Click the microphone and answer the question.'}
                  </div>
                </div>

                <button
                  onClick={
                    submitVoiceAnswer
                  }
                  disabled={
                    submitting ||
                    !answer.trim()
                  }
                  style={{
                    ...styles.submitButton,
                    opacity:
                      submitting ||
                      !answer.trim()
                        ? 0.5
                        : 1,
                    cursor:
                      submitting ||
                      !answer.trim()
                        ? 'not-allowed'
                        : 'pointer'
                  }}
                >
                  {submitting
                    ? 'AI is evaluating your answer...'
                    : questionNumber ===
                      totalQuestions
                    ? 'Submit final answer'
                    : 'Submit answer'}

                  {!submitting && (
                    <span>→</span>
                  )}
                </button>
              </div>
            </div>

            <div style={styles.tipsCard}>
              <div style={styles.tipsTitle}>
                LIVE INTERVIEW TIPS
              </div>

              <div style={styles.tipGrid}>
                <div style={styles.tip}>
                  <span style={styles.tipSpan}>
                    01
                  </span>

                  <p style={styles.tipText}>
                    Wait for the AI to finish
                    speaking before answering.
                  </p>
                </div>

                <div style={styles.tip}>
                  <span style={styles.tipSpan}>
                    02
                  </span>

                  <p style={styles.tipText}>
                    Speak clearly and explain
                    your reasoning.
                  </p>
                </div>

                <div style={styles.tip}>
                  <span style={styles.tipSpan}>
                    03
                  </span>

                  <p style={styles.tipText}>
                    You can stop and restart
                    your recording anytime.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside style={styles.side}>
            <div style={styles.cameraCard}>
              <div style={styles.cameraHeader}>
                <div>
                  <div style={styles.cameraTitle}>
                    Your camera
                  </div>

                  <div
                    style={
                      styles.cameraStatus
                    }
                  >
                    <span
                      style={{
                        ...styles.statusDot,
                        background: isWarning
                          ? '#b85b4e'
                          : cameraActive
                          ? '#4f8a5a'
                          : '#b85b4e'
                      }}
                    />

                    <span>
                      {cameraActive
                        ? proctorStatus
                        : 'Camera unavailable'}
                    </span>
                  </div>
                </div>

                <span
                  style={styles.liveBadge}
                >
                  LIVE
                </span>
              </div>

              <div
                style={styles.videoContainer}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={styles.video}
                />

                {!cameraActive && (
                  <div
                    style={
                      styles.cameraOverlay
                    }
                  >
                    <div
                      style={
                        styles.cameraIcon
                      }
                    >
                      ◉
                    </div>

                    <span>
                      Camera unavailable
                    </span>
                  </div>
                )}

                {cameraActive && (
                  <div
                    style={{
                      ...styles.monitorBadge,
                      background: isWarning
                        ? 'rgba(184,91,78,0.9)'
                        : 'rgba(8,29,43,0.8)'
                    }}
                  >
                    {isWarning
                      ? '⚠ Warning'
                      : '● Monitoring'}
                  </div>
                )}
              </div>

              {/*
               * PROCTORING ALERT
               *
               * This is the important new UI.
               *
               * When backend detects:
               * - multiple faces
               * - phone
               * - another person
               * - other violations
               *
               * the alert will appear here.
               */}
              {proctorAlert && (
                <div
                  style={
                    styles.warningBanner
                  }
                >
                  <span
                    style={
                      styles.warningIcon
                    }
                  >
                    ⚠️
                  </span>

                  <div>
                    <div
                      style={
                        styles.warningTitle
                      }
                    >
                      Proctoring Alert
                    </div>

                    <div
                      style={
                        styles.warningMessage
                      }
                    >
                      {proctorAlert.message}
                    </div>
                  </div>
                </div>
              )}

              {!proctorAlert &&
                cameraActive && (
                  <div
                    style={
                      styles.monitoringBanner
                    }
                  >
                    <span>●</span>
                    <span>
                      Camera monitoring active
                    </span>
                  </div>
                )}

              <div
                style={styles.cameraFooter}
              >
                <span>
                  Camera monitoring enabled
                </span>

                <span>
                  Privacy protected
                </span>
              </div>
            </div>

            <div style={styles.aiCard}>
              <div style={styles.aiAvatar}>
                AI
              </div>

              <div>
                <div style={styles.aiTitle}>
                  AI Interviewer
                </div>

                <div style={styles.aiStatus}>
                  {isSpeaking
                    ? 'Speaking to you'
                    : isListening
                      ? 'Listening to you'
                      : 'Waiting for response'}
                </div>
              </div>
            </div>

            <div style={styles.rulesCard}>
              <div style={styles.rulesTitle}>
                INTERVIEW GUIDELINES
              </div>

              <div style={styles.rule}>
                <span style={styles.ruleSpan}>
                  ✓
                </span>

                <p style={styles.ruleText}>
                  Stay visible to the camera.
                </p>
              </div>

              <div style={styles.rule}>
                <span style={styles.ruleSpan}>
                  ✓
                </span>

                <p style={styles.ruleText}>
                  Answer using your microphone.
                </p>
              </div>

              <div style={styles.rule}>
                <span style={styles.ruleSpan}>
                  ✓
                </span>

                <p style={styles.ruleText}>
                  Keep your answers clear.
                </p>
              </div>

              <div style={styles.rule}>
                <span style={styles.ruleSpan}>
                  ✓
                </span>

                <p style={styles.ruleText}>
                  Your responses are evaluated
                  automatically.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f4f0e8',
    color: '#173447',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  header: {
    height: 76,
    background: '#081d2b',
    color: '#fff'
  },

  headerInner: {
    width: '100%',
    maxWidth: 1420,
    margin: '0 auto',
    padding: '0 42px',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center'
  },

  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    cursor: 'pointer'
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: '#d7b86a',
    color: '#081d2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    fontSize: 23,
    fontWeight: 700
  },

  brand: {
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    fontWeight: 700
  },

  brandSub: {
    fontFamily: 'Georgia, serif',
    fontSize: 12,
    color: '#a9b7be'
  },

  headerCenter: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    fontSize: 13
  },

  headerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: '#9caeb6',
    fontWeight: 700
  },

  timer: {
    justifySelf: 'end',
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },

  timerSpan: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: '#9caeb6'
  },

  timerStrong: {
    fontFamily: 'Georgia, serif',
    fontSize: 19,
    color: '#d7b86a'
  },

  main: {
    maxWidth: 1420,
    margin: '0 auto',
    padding: '42px 42px 55px',
    boxSizing: 'border-box'
  },

  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 40,
    marginBottom: 28
  },

  pageEyebrow: {
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: 700,
    color: '#8a8176',
    marginBottom: 9
  },

  heading: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 45,
    lineHeight: 1.05,
    fontWeight: 500
  },

  description: {
    margin: '12px 0 0',
    color: '#777269',
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 610
  },

  progressBox: {
    width: 260,
    flexShrink: 0
  },

  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 10,
    color: '#827b72'
  },

  progressTrack: {
    height: 7,
    background: '#ddd7cd',
    borderRadius: 10,
    overflow: 'hidden'
  },

  progressFill: {
    height: '100%',
    background: '#315b6e',
    borderRadius: 10,
    transition: 'width 0.3s ease'
  },

  error: {
    background: '#f3dddd',
    border: '1px solid #e2bcbc',
    color: '#8a3636',
    padding: '12px 15px',
    borderRadius: 8,
    marginBottom: 18,
    fontSize: 13
  },

  browserWarning: {
    background: '#f4ead0',
    border: '1px solid #dfcc99',
    color: '#725b29',
    padding: '12px 15px',
    borderRadius: 8,
    marginBottom: 18,
    fontSize: 12
  },

  interviewGrid: {
    display: 'grid',
    gridTemplateColumns:
      'minmax(0, 1fr) 360px',
    gap: 23,
    alignItems: 'start'
  },

  questionCard: {
    background: '#fffdf8',
    border: '1px solid #dfd8cd',
    borderRadius: 16,
    padding: '29px 32px',
    boxShadow:
      '0 12px 35px rgba(30, 44, 51, 0.06)'
  },

  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20
  },

  questionLabel: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: 700,
    color: '#918679'
  },

  speakingStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
    fontSize: 10,
    color: '#817a71'
  },

  audioDot: {
    width: 7,
    height: 7,
    borderRadius: '50%'
  },

  replayButton: {
    border: '1px solid #d8d0c5',
    background: '#f7f3eb',
    color: '#31566a',
    borderRadius: 7,
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer'
  },

  questionBubble: {
    position: 'relative',
    marginTop: 25,
    background: '#e9e4d9',
    borderRadius: 12,
    padding: '28px 32px 28px 47px'
  },

  quote: {
    position: 'absolute',
    left: 18,
    top: 14,
    fontFamily: 'Georgia, serif',
    fontSize: 45,
    color: '#b49a63',
    lineHeight: 1
  },

  question: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 28,
    lineHeight: 1.35,
    fontWeight: 500,
    color: '#173447'
  },

  answerArea: {
    marginTop: 27
  },

  answerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 9,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#8f877d',
    fontWeight: 700
  },

  transcriptBox: {
    minHeight: 145,
    border: '1px solid #d7d0c5',
    borderRadius: 10,
    background: '#faf8f3',
    padding: 17,
    boxSizing: 'border-box',
    fontSize: 15,
    lineHeight: 1.7,
    color: '#173447',
    transition: 'border-color 0.2s ease'
  },

  placeholder: {
    color: '#a49d94'
  },

  voiceControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 17,
    marginTop: 15
  },

  micButton: {
    minWidth: 175,
    height: 48,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    transition: 'background 0.2s ease'
  },

  micIcon: {
    fontSize: 15
  },

  voiceHint: {
    color: '#888078',
    fontSize: 10,
    lineHeight: 1.5,
    maxWidth: 350
  },

  submitButton: {
    width: '100%',
    height: 52,
    border: 'none',
    borderRadius: 8,
    marginTop: 19,
    background: '#17394b',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 11
  },

  tipsCard: {
    marginTop: 16,
    background: '#e9e4d9',
    borderRadius: 13,
    padding: '20px 23px'
  },

  tipsTitle: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: 700,
    color: '#81786d',
    marginBottom: 15
  },

  tipGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(3, 1fr)',
    gap: 15
  },

  tip: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start'
  },

  tipSpan: {
    color: '#9a7a36',
    fontSize: 10,
    fontWeight: 700
  },

  tipText: {
    margin: 0,
    color: '#6d6860',
    fontSize: 11,
    lineHeight: 1.45
  },

  side: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15
  },

  cameraCard: {
    background: '#fffdf8',
    border: '1px solid #dfd8cd',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow:
      '0 12px 35px rgba(30, 44, 51, 0.06)'
  },

  cameraHeader: {
    padding: '17px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  cameraTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#173447'
  },

  cameraStatus: {
    marginTop: 5,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: '#817a71',
    maxWidth: 270
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0
  },

  liveBadge: {
    background: '#f0ded8',
    color: '#8c493e',
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: 700,
    padding: '5px 8px',
    borderRadius: 12
  },

  videoContainer: {
    height: 235,
    background: '#142630',
    position: 'relative',
    overflow: 'hidden'
  },

  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)'
  },

  cameraOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aab8be',
    gap: 9,
    fontSize: 12
  },

  cameraIcon: {
    fontSize: 28
  },

  monitorBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    color: '#fff',
    borderRadius: 5,
    padding: '6px 8px',
    fontSize: 9
  },

  warningBanner: {
    background: '#fcf0ed',
    borderTop: '1px solid #f2d6d0',
    color: '#9e3b2e',
    padding: '12px 14px',
    fontSize: 11,
    fontWeight: 700,
    textAlign: 'left',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 9
  },

  warningIcon: {
    fontSize: 16,
    flexShrink: 0,
    lineHeight: 1.2
  },

  warningTitle: {
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 3
  },

  warningMessage: {
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.45
  },

  monitoringBanner: {
    background: '#edf5ee',
    borderTop: '1px solid #d8e8da',
    color: '#47704d',
    padding: '9px 14px',
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },

  cameraFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '11px 15px',
    fontSize: 9,
    color: '#8a8379'
  },

  aiCard: {
    background: '#31566a',
    color: '#fff',
    borderRadius: 14,
    padding: '17px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },

  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#d7b86a',
    color: '#173447',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700
  },

  aiTitle: {
    fontSize: 12,
    fontWeight: 700
  },

  aiStatus: {
    marginTop: 4,
    color: '#c9d3d6',
    fontSize: 10
  },

  rulesCard: {
    background: '#081d2b',
    color: '#fff',
    borderRadius: 14,
    padding: '20px'
  },

  rulesTitle: {
    fontSize: 9,
    letterSpacing: 1.7,
    color: '#aab8bf',
    fontWeight: 700,
    marginBottom: 15
  },

  rule: {
    display: 'flex',
    gap: 9,
    alignItems: 'flex-start',
    marginBottom: 11
  },

  ruleSpan: {
    color: '#d7b86a',
    fontWeight: 700,
    fontSize: 11
  },

  ruleText: {
    margin: 0,
    color: '#c2ccd0',
    fontSize: 10,
    lineHeight: 1.4
  },

  loadingPage: {
    minHeight: '100vh',
    background: '#f4f0e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  loadingCard: {
    textAlign: 'center',
    background: '#fffdf8',
    border: '1px solid #ddd5c9',
    borderRadius: 18,
    padding: '45px 60px',
    boxShadow:
      '0 20px 50px rgba(30, 44, 51, 0.08)'
  },

  loadingLogo: {
    width: 55,
    height: 55,
    borderRadius: 14,
    margin: '0 auto 22px',
    background: '#17394b',
    color: '#d7b86a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    fontSize: 28
  },

  loadingTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    color: '#173447',
    margin: 0
  },

  loadingText: {
    marginTop: 8,
    color: '#827b72',
    fontSize: 12
  },

  loader: {
    width: 28,
    height: 28,
    border: '3px solid #ddd7cd',
    borderTop: '3px solid #315b6e',
    borderRadius: '50%',
    margin: '25px auto 0'
  },

  completePage: {
    minHeight: '100vh',
    background: '#f4f0e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30
  },

  completeCard: {
    width: 'min(600px, 100%)',
    background: '#fffdf8',
    border: '1px solid #ddd5c9',
    borderRadius: 18,
    padding: 55,
    textAlign: 'center',
    boxShadow:
      '0 20px 55px rgba(30, 44, 51, 0.08)'
  },

  completeIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 22px',
    borderRadius: '50%',
    background: '#315d3a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28
  },

  completeLabel: {
    color: '#7c705d',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 700
  },

  completeTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 48,
    fontWeight: 500,
    margin: '9px 0'
  },

  completeText: {
    maxWidth: 460,
    margin: '0 auto 28px',
    color: '#777269',
    fontSize: 14,
    lineHeight: 1.7
  },

  primaryButton: {
    width: '100%',
    height: 50,
    border: 'none',
    borderRadius: 8,
    background: '#17394b',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  },

  secondaryButton: {
    marginTop: 10,
    width: '100%',
    height: 48,
    border: '1px solid #d2cabe',
    borderRadius: 8,
    background: 'transparent',
    color: '#31566a',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  }
};