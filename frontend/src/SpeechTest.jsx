import React, { useRef, useState } from 'react';

export default function SpeechTest() {
  const recognitionRef = useRef(null);

  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const start = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported.');
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      console.log('TEST MICROPHONE STARTED');
      setListening(true);
      setError('');
      setText('');
    };

    recognition.onresult = (event) => {
      let result = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        result +=
          event.results[i][0].transcript;
      }

      console.log(
        'TEST SPEECH RESULT:',
        result
      );

      setText(result);
    };

    recognition.onerror = (event) => {
      console.error(
        'TEST SPEECH ERROR:',
        event.error
      );

      setError(
        `Speech error: ${event.error}`
      );

      setListening(false);
    };

    recognition.onend = () => {
      console.log(
        'TEST MICROPHONE ENDED'
      );

      setListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error(
        'TEST START ERROR:',
        err
      );

      setError(err.message);
    }
  };

  return (
    <div
      style={{
        padding: '50px',
        fontFamily: 'Arial'
      }}
    >
      <h1>Speech Recognition Test</h1>

      <button
        onClick={start}
        disabled={listening}
        style={{
          padding: '12px 25px',
          fontSize: '18px'
        }}
      >
        {listening
          ? 'Listening...'
          : 'Start Microphone'}
      </button>

      <h3>
        Status:{' '}
        {listening
          ? 'Listening'
          : 'Stopped'}
      </h3>

      <h3>Transcript</h3>

      <p>
        {text || 'Speak something...'}
      </p>

      {error && (
        <p
          style={{
            color: 'red'
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}