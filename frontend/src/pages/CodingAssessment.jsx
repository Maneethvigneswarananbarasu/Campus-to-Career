import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProctoringMonitor from '../components/ProctoringMonitor';

const API_URL = 'http://localhost:8000';

export default function CodingAssessment() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [difficulty, setDifficulty] = useState('Medium');
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(45 * 60);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role && parsedUser.role !== 'student') {
        navigate('/officer-dashboard');
        return;
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!problem || timeLeft <= 0) {
      return;
    }

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
  }, [problem]);

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  };

  const generateProblem = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setMessage('');
    setResults([]);
    setProblem(null);

    try {
      const response = await fetch(
        `${API_URL}/api/coding/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            skills: 'Python, Java, SQL, Data Structures and Algorithms, OOP',
            difficulty: difficulty
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate problem');
      }

      const data = await response.json();

      setProblem(data);
      setCode(data.starter_code || '');
      setTimeLeft(45 * 60);
    } catch (error) {
      console.error(error);
      setMessage(
        'Unable to generate the assessment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    if (!problem || !user) {
      return;
    }

    setRunning(true);
    setMessage('');
    setResults([]);

    try {
      const response = await fetch(
        `${API_URL}/api/coding/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assessment_id: problem.assessment_id,
            code,
            test_input: problem.examples?.[0]?.input ?? null
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Code execution failed');
      }

      const data = await response.json();

      setResults(data.results || []);
    } catch (error) {
      console.error(error);
      setMessage(
        'Unable to run the code. Please check your solution.'
      );
    } finally {
      setRunning(false);
    }
  };

  const submitAssessment = async () => {
    if (!problem || !user) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit your coding assessment?'
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(
        `${API_URL}/api/coding/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            assessment_id: problem.assessment_id,
            code
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Submission failed');
      }

      const data = await response.json();

      setResults(data.results || []);
      setMessage(
        `Assessment submitted successfully. Score: ${
          data.score ?? 0
        }`
      );
    } catch (error) {
      console.error(error);
      setMessage(
        'Unable to submit the assessment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const passedCount = results.filter(
    (item) => item.status === 'success'
  ).length;

  const failedCount = results.filter(
    (item) => item.status !== 'success'
  ).length;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brand}>
            <div style={styles.brandIcon}>→</div>

            <div>
              <div style={styles.brandName}>
                Campus→Career
              </div>

              <div style={styles.brandSubtitle}>
                STUDENT WORKSPACE
              </div>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.workspaceLabel}>
            WORKSPACE
          </div>

          <nav style={styles.nav}>
            <button
              style={styles.navItem}
              onClick={() =>
                navigate('/student-dashboard')
              }
            >
              <span style={styles.navIcon}>▦</span>
              <span>Dashboard</span>
              <span style={styles.navNumber}>01</span>
            </button>

            <button
              style={styles.navItem}
              onClick={() =>
                navigate('/student-dashboard')
              }
            >
              <span style={styles.navIcon}>▤</span>
              <span>Resume</span>
              <span style={styles.navNumber}>02</span>
            </button>

            <button
              style={{
                ...styles.navItem,
                ...styles.activeNavItem
              }}
              onClick={() =>
                navigate('/coding-assessment')
              }
            >
              <span style={styles.navIcon}>
                &lt;/&gt;
              </span>

              <span>Coding</span>

              <span style={styles.navNumber}>
                03
              </span>
            </button>

            <button
              style={styles.navItem}
              onClick={() =>
                navigate('/interview-room')
              }
            >
              <span style={styles.navIcon}>◉</span>
              <span>Interview</span>
              <span style={styles.navNumber}>04</span>
            </button>

            <button
              style={styles.navItem}
              onClick={() =>
                navigate('/student-results')
              }
            >
              <span style={styles.navIcon}>◌</span>
              <span>Results</span>
              <span style={styles.navNumber}>05</span>
            </button>
          </nav>
        </div>

        <div>
          <div style={styles.cohortCard}>
            <div style={styles.cohortHeader}>
              <span style={styles.cohortDot} />
              PLACEMENT 2025–26
            </div>

            <div style={styles.cohortText}>
              Your assessment progress is saved to
              your placement record.
            </div>
          </div>

          <div style={styles.sidebarBottom}>
            <div style={styles.email}>
              {user?.email || 'Student'}
            </div>

            <button
              style={styles.logoutButton}
              onClick={() => {
                localStorage.removeItem('user');
                navigate('/login');
              }}
            >
              <span style={styles.logoutIcon}>↪</span>
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topBar}>
          <div style={styles.breadcrumb}>
            <span>Campus to Career</span>
            <span style={styles.breadcrumbSlash}>
              /
            </span>
            <span>Coding assessment</span>
          </div>

          <div style={styles.topRight}>
            <div style={styles.liveBadge}>
              <span style={styles.liveDot} />
              Live assessment
            </div>

            <div style={styles.profileCircle}>
              {user?.full_name
                ? user.full_name
                    .charAt(0)
                    .toUpperCase()
                : 'S'}
            </div>

            <div style={styles.topProfile}>
              <strong>
                {user?.full_name || 'Student'}
              </strong>

              <span>Student workspace</span>
            </div>
          </div>
        </header>

        <div style={styles.content}>
          <section style={styles.pageHeader}>
            <div>
              <div style={styles.eyebrow}>
                STUDENT WORKSPACE / TECHNICAL ASSESSMENT
              </div>

              <h1 style={styles.pageTitle}>
                Coding assessment
              </h1>

              <p style={styles.pageSubtitle}>
                Solve a programming problem and show
                how you think through the solution.
              </p>
            </div>

            {problem && (
              <div style={styles.timerBox}>
                <div style={styles.timerLabel}>
                  TIME REMAINING
                </div>

                <div
                  style={{
                    ...styles.timer,
                    color:
                      timeLeft < 300
                        ? '#b35b4b'
                        : '#2f4556'
                  }}
                >
                  {formatTime()}
                </div>
              </div>
            )}
          </section>

          {!problem && (
            <section style={styles.startCard}>
              <div style={styles.startIcon}>
                &lt;/&gt;
              </div>

              <div style={styles.startContent}>
                <div style={styles.startEyebrow}>
                  AI GENERATED ASSESSMENT
                </div>

                <h2 style={styles.startTitle}>
                  Test your problem-solving skills.
                </h2>

                <p style={styles.startText}>
                  Choose a difficulty level and generate
                  a coding problem based on your skills.
                  Your solution will be evaluated against
                  hidden test cases.
                </p>

                <div style={styles.difficultyRow}>
                  {['Easy', 'Medium', 'Hard'].map(
                    (level) => (
                      <button
                        key={level}
                        onClick={() =>
                          setDifficulty(level)
                        }
                        style={{
                          ...styles.difficultyButton,
                          ...(difficulty === level
                            ? styles.selectedDifficulty
                            : {})
                        }}
                      >
                        {level}
                      </button>
                    )
                  )}

                  <button
                    style={styles.generateButton}
                    onClick={generateProblem}
                    disabled={loading}
                  >
                    <span>✦</span>

                    {loading
                      ? 'Generating...'
                      : 'New problem'}
                  </button>
                </div>

                {message && (
                  <div style={styles.message}>
                    {message}
                  </div>
                )}
              </div>
            </section>
          )}

          {problem && (
            <>
              <section style={styles.problemCard}>
                <div style={styles.problemTop}>
                  <div>
                    <div style={styles.problemMeta}>
                      <span
                        style={{
                          ...styles.difficultyTag,
                          background:
                            difficulty === 'Easy'
                              ? '#edf5ed'
                              : difficulty === 'Hard'
                                ? '#f8ece8'
                                : '#f3efe5',
                          color:
                            difficulty === 'Easy'
                              ? '#648064'
                              : difficulty === 'Hard'
                                ? '#a05c4f'
                                : '#927348'
                        }}
                      >
                        {problem.difficulty ||
                          difficulty}
                      </span>

                      <span style={styles.topicTag}>
                        {problem.topic ||
                          'Programming'}
                      </span>
                    </div>

                    <h2 style={styles.problemTitle}>
                      {problem.title}
                    </h2>
                  </div>

                  <button
                    style={styles.smallNewButton}
                    onClick={generateProblem}
                    disabled={loading}
                  >
                    ✦ New problem
                  </button>
                </div>

                <div style={styles.problemDescription}>
                  {problem.description}
                </div>

                {problem.constraints &&
                  problem.constraints.length > 0 && (
                    <div style={styles.infoBlock}>
                      <div style={styles.infoTitle}>
                        Constraints
                      </div>

                      <ul style={styles.constraintList}>
                        {problem.constraints.map(
                          (constraint, index) => (
                            <li key={index}>
                              {constraint}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                {problem.examples &&
                  problem.examples.length > 0 && (
                    <div style={styles.infoBlock}>
                      <div style={styles.infoTitle}>
                        Examples
                      </div>

                      <div style={styles.examples}>
                        {problem.examples.map(
                          (example, index) => (
                            <div
                              key={index}
                              style={styles.exampleCard}
                            >
                              <div>
                                <span
                                  style={
                                    styles.exampleLabel
                                  }
                                >
                                  INPUT
                                </span>

                                <pre
                                  style={
                                    styles.exampleCode
                                  }
                                >
                                  {JSON.stringify(
                                    example.input,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>

                              <div>
                                <span
                                  style={
                                    styles.exampleLabel
                                  }
                                >
                                  OUTPUT
                                </span>

                                <pre
                                  style={
                                    styles.exampleCode
                                  }
                                >
                                  {JSON.stringify(
                                    example.output,
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>

                              {example.explanation && (
                                <div
                                  style={
                                    styles.exampleExplanation
                                  }
                                >
                                  {example.explanation}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </section>

              <section style={styles.editorSection}>
                <div style={styles.editorHeader}>
                  <div>
                    <div style={styles.editorEyebrow}>
                      YOUR SOLUTION
                    </div>

                    <div style={styles.functionName}>
                      {problem.function_name
                        ? `${problem.function_name}()`
                        : 'solution()'}
                    </div>
                  </div>

                  <div style={styles.editorActions}>
                    <button
                      style={styles.runButton}
                      onClick={runCode}
                      disabled={running || submitting}
                    >
                      {running
                        ? 'Running...'
                        : 'Run code'}
                    </button>

                    <button
                      style={styles.submitButton}
                      onClick={submitAssessment}
                      disabled={
                        submitting || running
                      }
                    >
                      {submitting
                        ? 'Submitting...'
                        : 'Submit assessment'}
                    </button>
                  </div>
                </div>

                <div style={styles.editor}>
                  <div style={styles.editorTop}>
                    <span>Python</span>

                    <span>
                      {problem.function_name
                        ? problem.function_name
                        : 'solution'}
                    </span>
                  </div>

                  <textarea
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value)
                    }
                    spellCheck="false"
                    style={styles.codeArea}
                  />
                </div>
              </section>

              {message && (
                <div style={styles.message}>
                  {message}
                </div>
              )}

              {results.length > 0 && (
                <section style={styles.resultsCard}>
                  <div style={styles.resultsHeader}>
                    <div>
                      <div style={styles.sectionEyebrow}>
                        TEST RESULTS
                      </div>

                      <h2 style={styles.resultsTitle}>
                        Solution evaluation
                      </h2>
                    </div>

                    <div style={styles.resultSummary}>
                      <span style={styles.passed}>
                        {passedCount} passed
                      </span>

                      {failedCount > 0 && (
                        <span style={styles.failed}>
                          {failedCount} failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={styles.resultList}>
                    {results.map((result, index) => {
                      const passed =
                        result.status === 'success';

                      return (
                        <div
                          key={index}
                          style={styles.resultRow}
                        >
                          <div
                            style={{
                              ...styles.resultStatus,
                              background: passed
                                ? '#e9f2e9'
                                : '#f8eae6',
                              color: passed
                                ? '#628066'
                                : '#a45f51'
                            }}
                          >
                            {passed ? '✓' : '×'}
                          </div>

                          <div
                            style={styles.resultDetails}
                          >
                            <strong>
                              Test case {index + 1}
                            </strong>

                            <span>
                              Input:{' '}
                              {JSON.stringify(
                                result.input
                              )}
                            </span>
                          </div>

                          <div
                            style={
                              styles.resultOutput
                            }
                          >
                            {passed
                              ? `Output: ${JSON.stringify(
                                  result.output
                                )}`
                              : result.error ||
                                'Test case failed'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section style={styles.bottomActions}>
                <button
                  style={styles.backButton}
                  onClick={() =>
                    navigate('/student-dashboard')
                  }
                >
                  ← Back to dashboard
                </button>

                <button
                  style={styles.resultsButton}
                  onClick={() =>
                    navigate('/student-results')
                  }
                >
                  View my results →
                </button>
              </section>
            </>
          )}

          <footer style={styles.footer}>
            <span>Campus to Career</span>
            <span>
              Technical assessment · 2025–26
            </span>
          </footer>
        </div>
      </main>

      <ProctoringMonitor userId={user?.id} />
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f7f4ed',
    color: '#203246',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  sidebar: {
    width: '250px',
    minHeight: '100vh',
    background: '#0a1d2b',
    color: '#f7f3eb',
    padding: '22px 16px 18px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 8px'
  },

  brandIcon: {
    width: '29px',
    height: '29px',
    borderRadius: '8px',
    background: '#e2b765',
    color: '#0a1d2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '17px'
  },

  brandName: {
    fontFamily: 'Georgia, serif',
    fontWeight: '700',
    fontSize: '18px',
    letterSpacing: '-0.5px'
  },

  brandSubtitle: {
    fontSize: '7px',
    letterSpacing: '1.5px',
    color: '#9caab2',
    marginTop: '3px'
  },

  divider: {
    height: '1px',
    background: '#213442',
    margin: '20px 8px'
  },

  workspaceLabel: {
    fontSize: '8px',
    letterSpacing: '1.8px',
    color: '#7f919c',
    margin: '0 10px 9px'
  },

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  navItem: {
    border: '0',
    background: 'transparent',
    color: '#bdc8ce',
    padding: '11px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    width: '100%'
  },

  activeNavItem: {
    background: '#1b3040',
    color: '#f1f0ea',
    boxShadow: 'inset 0 0 0 1px #e3e0d7'
  },

  navIcon: {
    width: '19px',
    fontSize: '15px',
    color: '#b8c3c9'
  },

  navNumber: {
    marginLeft: 'auto',
    fontSize: '8px',
    color: '#71838e',
    letterSpacing: '1px'
  },

  cohortCard: {
    border: '1px solid #263b49',
    borderRadius: '8px',
    padding: '12px',
    margin: '0 2px 15px',
    background: '#102635'
  },

  cohortHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '7px',
    letterSpacing: '1.2px',
    color: '#c9d0d3'
  },

  cohortDot: {
    width: '6px',
    height: '6px',
    background: '#83a887',
    borderRadius: '50%',
    display: 'inline-block'
  },

  cohortText: {
    fontSize: '9px',
    lineHeight: '1.5',
    color: '#9eafb8',
    marginTop: '7px'
  },

  sidebarBottom: {
    borderTop: '1px solid #263b49',
    padding: '16px 8px 0'
  },

  email: {
    fontSize: '11px',
    color: '#d3ad70',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '13px'
  },

  logoutButton: {
    border: 0,
    background: 'transparent',
    color: '#c7d0d4',
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0'
  },

  logoutIcon: {
    fontSize: '20px'
  },

  main: {
    marginLeft: '250px',
    width: 'calc(100% - 250px)',
    minHeight: '100vh'
  },

  topBar: {
    height: '58px',
    borderBottom: '1px solid #e1ddd3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 42px',
    boxSizing: 'border-box',
    background: '#f8f6f0'
  },

  breadcrumb: {
    fontSize: '9px',
    color: '#82909a',
    display: 'flex',
    gap: '8px'
  },

  breadcrumbSlash: {
    color: '#b3b5b0'
  },

  topRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  liveBadge: {
    fontSize: '9px',
    border: '1px solid #d9e3d8',
    background: '#f1f6ef',
    color: '#54715a',
    padding: '6px 10px',
    borderRadius: '20px'
  },

  liveDot: {
    width: '5px',
    height: '5px',
    background: '#7da27f',
    display: 'inline-block',
    borderRadius: '50%',
    marginRight: '5px'
  },

  profileCircle: {
    width: '25px',
    height: '25px',
    borderRadius: '50%',
    background: '#eadfca',
    color: '#6c5838',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px'
  },

  topProfile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '9px',
    color: '#25394a'
  },

  content: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '38px 48px 30px',
    boxSizing: 'border-box'
  },

  pageHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '24px'
  },

  eyebrow: {
    fontSize: '8px',
    letterSpacing: '1.7px',
    color: '#9a9991',
    marginBottom: '10px'
  },

  pageTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '39px',
    lineHeight: '1',
    letterSpacing: '-1.4px',
    color: '#273b4c',
    margin: 0
  },

  pageSubtitle: {
    fontSize: '12px',
    color: '#697c8d',
    margin: '9px 0 0'
  },

  timerBox: {
    border: '1px solid #dedbd2',
    background: '#fcfbf7',
    borderRadius: '8px',
    padding: '10px 16px',
    textAlign: 'right'
  },

  timerLabel: {
    fontSize: '7px',
    letterSpacing: '1.2px',
    color: '#979b96',
    marginBottom: '3px'
  },

  timer: {
    fontFamily: 'Georgia, serif',
    fontSize: '22px'
  },

  startCard: {
    background: '#fcfbf7',
    border: '1px solid #dedbd2',
    borderRadius: '10px',
    padding: '38px',
    display: 'flex',
    gap: '25px',
    minHeight: '260px',
    boxSizing: 'border-box'
  },

  startIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    background: '#eaf0ef',
    color: '#58766f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0
  },

  startContent: {
    flex: 1
  },

  startEyebrow: {
    fontSize: '7px',
    letterSpacing: '1.5px',
    color: '#929792',
    marginBottom: '10px'
  },

  startTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '25px',
    margin: 0,
    color: '#304557'
  },

  startText: {
    fontSize: '11px',
    lineHeight: '1.7',
    color: '#7d898e',
    maxWidth: '600px',
    margin: '11px 0 23px'
  },

  difficultyRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  difficultyButton: {
    border: '1px solid #ddd9cf',
    background: '#fbfaf6',
    color: '#344657',
    padding: '9px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11px'
  },

  selectedDifficulty: {
    background: '#0f2535',
    color: '#fff',
    borderColor: '#0f2535'
  },

  generateButton: {
    border: 0,
    background: '#e4aa48',
    color: '#172a39',
    padding: '10px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11px',
    marginLeft: '4px',
    fontWeight: '600'
  },

  message: {
    marginTop: '13px',
    padding: '10px 13px',
    borderRadius: '6px',
    background: '#eef4ed',
    color: '#607565',
    fontSize: '10px'
  },

  problemCard: {
    background: '#fcfbf7',
    border: '1px solid #dedbd2',
    borderRadius: '10px',
    padding: '25px',
    marginBottom: '15px'
  },

  problemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px'
  },

  problemMeta: {
    display: 'flex',
    gap: '7px',
    marginBottom: '9px'
  },

  difficultyTag: {
    fontSize: '7px',
    padding: '5px 8px',
    borderRadius: '12px',
    fontWeight: '600'
  },

  topicTag: {
    fontSize: '7px',
    padding: '5px 8px',
    borderRadius: '12px',
    background: '#eef1f1',
    color: '#65777d'
  },

  problemTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '24px',
    margin: 0,
    color: '#304557'
  },

  smallNewButton: {
    border: '1px solid #ddd9cf',
    background: '#fbfaf6',
    color: '#344657',
    borderRadius: '7px',
    padding: '8px 11px',
    cursor: 'pointer',
    height: 'fit-content',
    fontSize: '9px'
  },

  problemDescription: {
    marginTop: '18px',
    color: '#586c7b',
    fontSize: '11px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap'
  },

  infoBlock: {
    marginTop: '20px'
  },

  infoTitle: {
    fontSize: '8px',
    letterSpacing: '1.2px',
    color: '#8b918e',
    marginBottom: '9px',
    textTransform: 'uppercase'
  },

  constraintList: {
    margin: 0,
    paddingLeft: '18px',
    color: '#687982',
    fontSize: '10px',
    lineHeight: '1.8'
  },

  examples: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '9px'
  },

  exampleCard: {
    background: '#f4f2ec',
    borderRadius: '7px',
    padding: '12px'
  },

  exampleLabel: {
    fontSize: '7px',
    letterSpacing: '1px',
    color: '#969991'
  },

  exampleCode: {
    margin: '6px 0 10px',
    fontFamily: 'Consolas, monospace',
    fontSize: '10px',
    color: '#3b4e5d',
    whiteSpace: 'pre-wrap'
  },

  exampleExplanation: {
    borderTop: '1px solid #dedbd2',
    paddingTop: '8px',
    color: '#7b878b',
    fontSize: '9px',
    lineHeight: '1.5'
  },

  editorSection: {
    background: '#fcfbf7',
    border: '1px solid #dedbd2',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '15px'
  },

  editorHeader: {
    padding: '15px 18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e3dfd6'
  },

  editorEyebrow: {
    fontSize: '7px',
    letterSpacing: '1.4px',
    color: '#959a95',
    marginBottom: '4px'
  },

  functionName: {
    fontFamily: 'Consolas, monospace',
    fontSize: '11px',
    color: '#354a5a'
  },

  editorActions: {
    display: 'flex',
    gap: '7px'
  },

  runButton: {
    border: '1px solid #d8d5cc',
    background: '#f9f8f4',
    color: '#344657',
    borderRadius: '6px',
    padding: '8px 13px',
    fontSize: '9px',
    cursor: 'pointer'
  },

  submitButton: {
    border: 0,
    background: '#e3a947',
    color: '#192d3d',
    borderRadius: '6px',
    padding: '8px 13px',
    fontSize: '9px',
    cursor: 'pointer',
    fontWeight: '600'
  },

  editor: {
    background: '#142936'
  },

  editorTop: {
    height: '30px',
    padding: '0 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#91a2a9',
    background: '#10232f',
    fontSize: '8px'
  },

  codeArea: {
    width: '100%',
    minHeight: '360px',
    border: 0,
    outline: 0,
    resize: 'vertical',
    background: '#142936',
    color: '#e6ecec',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '1.65'
  },

  resultsCard: {
    background: '#fcfbf7',
    border: '1px solid #dedbd2',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '15px'
  },

  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  sectionEyebrow: {
    fontSize: '7px',
    letterSpacing: '1.5px',
    color: '#999b94',
    marginBottom: '6px'
  },

  resultsTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '19px',
    margin: 0,
    color: '#334858'
  },

  resultSummary: {
    display: 'flex',
    gap: '7px'
  },

  passed: {
    fontSize: '8px',
    color: '#638066',
    background: '#eaf2e9',
    padding: '6px 9px',
    borderRadius: '12px'
  },

  failed: {
    fontSize: '8px',
    color: '#a45e51',
    background: '#f8eae6',
    padding: '6px 9px',
    borderRadius: '12px'
  },

  resultList: {
    marginTop: '15px'
  },

  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    padding: '10px 0',
    borderTop: '1px solid #e8e4db'
  },

  resultStatus: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    flexShrink: 0
  },

  resultDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: '200px',
    fontSize: '9px',
    color: '#6e7d83'
  },

  resultOutput: {
    marginLeft: 'auto',
    maxWidth: '400px',
    fontFamily: 'Consolas, monospace',
    fontSize: '8px',
    color: '#7b8588',
    textAlign: 'right'
  },

  bottomActions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '18px'
  },

  backButton: {
    border: '1px solid #ddd9cf',
    background: '#fbfaf6',
    color: '#536a76',
    borderRadius: '7px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontSize: '9px'
  },

  resultsButton: {
    border: 0,
    background: '#20394b',
    color: '#f8f5ee',
    borderRadius: '7px',
    padding: '9px 13px',
    cursor: 'pointer',
    fontSize: '9px'
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '31px',
    paddingTop: '13px',
    borderTop: '1px solid #e2ded5',
    fontSize: '7px',
    color: '#a0a19a'
  }
};