import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

export default function StudentResult() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      navigate('/student-login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== 'student') {
      navigate('/officer-login');
      return;
    }

    setUser(parsedUser);
    loadResults(parsedUser.id);
  }, []);

  const loadResults = async (userId) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/student/${userId}/results`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to load results'
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
        'Unable to load your results.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getNumber = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const number = Number(
      String(value).replace('%', '')
    );

    return Number.isNaN(number) ? null : number;
  };

  const getValue = (...values) => {
    for (const value of values) {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        return value;
      }
    }

    return 'Pending';
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingLogo}>C</div>
          <h2 style={styles.loadingTitle}>
            Preparing your results
          </h2>
          <p style={styles.loadingText}>
            Loading your placement readiness report...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>!</div>

          <h2 style={styles.errorTitle}>
            Unable to load results
          </h2>

          <p style={styles.errorText}>
            {error}
          </p>

          <button
            style={styles.primaryButton}
            onClick={() => navigate('/student-dashboard')}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const codingScore = getNumber(
    result?.coding_score,
    result?.codingScore
  );

  const interviewScore = getNumber(
    result?.interview_score,
    result?.interviewScore
  );

  const readinessScore = getNumber(
    result?.readiness_score,
    result?.readinessScore,
    result?.overall_score,
    result?.overallScore
  );

  const resumeStatus = getValue(
    result?.resume_status,
    result?.resumeStatus,
    result?.resume
  );

  const codingStatus =
    codingScore !== null
      ? 'Completed'
      : getValue(
          result?.coding_status,
          result?.codingStatus,
          'Pending'
        );

  const interviewStatus =
    interviewScore !== null
      ? 'Completed'
      : getValue(
          result?.interview_status,
          result?.interviewStatus,
          'Pending'
        );

  const completed =
    codingStatus === 'Completed' &&
    interviewStatus === 'Completed' &&
    resumeStatus !== 'Pending';

  const readinessLabel =
    readinessScore === null
      ? 'In progress'
      : readinessScore >= 80
        ? 'Placement ready'
        : readinessScore >= 60
          ? 'Nearly ready'
          : 'Keep improving';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div
            style={styles.logoArea}
            onClick={() => navigate('/student-dashboard')}
          >
            <div style={styles.logo}>C</div>

            <div>
              <div style={styles.brand}>Campus</div>
              <div style={styles.brandSub}>to Career</div>
            </div>
          </div>

          <div style={styles.headerTitle}>
            MY RESULTS
          </div>

          <button
            style={styles.dashboardButton}
            onClick={() => navigate('/student-dashboard')}
          >
            Dashboard →
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>
              PLACEMENT READINESS REPORT
            </div>

            <h1 style={styles.heroTitle}>
              Your progress,
              <br />
              <em>measured.</em>
            </h1>

            <p style={styles.heroText}>
              A summary of your resume, coding assessment
              and AI interview performance.
            </p>
          </div>

          <div style={styles.heroScore}>
            <div style={styles.scoreLabel}>
              OVERALL READINESS
            </div>

            <div style={styles.score}>
              {readinessScore !== null
                ? readinessScore
                : '—'}
              {readinessScore !== null && (
                <span>%</span>
              )}
            </div>

            <div style={styles.scoreStatus}>
              {readinessLabel}
            </div>
          </div>
        </section>

        <section style={styles.summaryGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricTop}>
              <span>01</span>
              <span>RESUME</span>
            </div>

            <h3 style={styles.metricTitle}>
              Profile
            </h3>

            <strong style={styles.metricValue}>
              {resumeStatus}
            </strong>

            <p style={styles.metricText}>
              Your resume profile and details.
            </p>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricTop}>
              <span>02</span>
              <span>CODING</span>
            </div>

            <h3 style={styles.metricTitle}>
              Technical skills
            </h3>

            <strong style={styles.metricValue}>
              {codingScore !== null
                ? `${codingScore}%`
                : 'Pending'}
            </strong>

            <p style={styles.metricText}>
              Programming assessment performance.
            </p>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricTop}>
              <span>03</span>
              <span>INTERVIEW</span>
            </div>

            <h3 style={styles.metricTitle}>
              Interview skills
            </h3>

            <strong style={styles.metricValue}>
              {interviewScore !== null
                ? `${interviewScore}%`
                : 'Pending'}
            </strong>

            <p style={styles.metricText}>
              AI interview evaluation.
            </p>
          </div>
        </section>

        <section style={styles.reportGrid}>
          <div style={styles.performanceCard}>
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionEyebrow}>
                  PERFORMANCE
                </div>

                <h2 style={styles.sectionTitle}>
                  Assessment breakdown
                </h2>
              </div>

              <div style={styles.statusPill}>
                {completed
                  ? '✓ Completed'
                  : 'In progress'}
              </div>
            </div>

            <div style={styles.performanceItem}>
              <div style={styles.performanceInfo}>
                <div>
                  <strong>Resume readiness</strong>
                  <span>
                    Profile completeness
                  </span>
                </div>

                <b>
                  {resumeStatus}
                </b>
              </div>

              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width:
                      resumeStatus === 'Uploaded'
                        ? '100%'
                        : '25%'
                  }}
                />
              </div>
            </div>

            <div style={styles.performanceItem}>
              <div style={styles.performanceInfo}>
                <div>
                  <strong>Coding assessment</strong>
                  <span>
                    Problem-solving performance
                  </span>
                </div>

                <b>
                  {codingScore !== null
                    ? `${codingScore}%`
                    : 'Pending'}
                </b>
              </div>

              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width:
                      codingScore !== null
                        ? `${Math.min(codingScore, 100)}%`
                        : '0%'
                  }}
                />
              </div>
            </div>

            <div style={styles.performanceItem}>
              <div style={styles.performanceInfo}>
                <div>
                  <strong>AI interview</strong>
                  <span>
                    Technical communication
                  </span>
                </div>

                <b>
                  {interviewScore !== null
                    ? `${interviewScore}%`
                    : 'Pending'}
                </b>
              </div>

              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width:
                      interviewScore !== null
                        ? `${Math.min(interviewScore, 100)}%`
                        : '0%'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={styles.readinessCard}>
            <div style={styles.sectionEyebrow}>
              READINESS
            </div>

            <h2 style={styles.readinessTitle}>
              {readinessLabel}
            </h2>

            <div style={styles.circle}>
              <div>
                <strong>
                  {readinessScore !== null
                    ? readinessScore
                    : '—'}
                </strong>

                {readinessScore !== null && (
                  <span>%</span>
                )}
              </div>
            </div>

            <p style={styles.readinessText}>
              {readinessScore >= 80
                ? 'Your profile shows strong preparation for placement opportunities.'
                : readinessScore >= 60
                  ? 'You are making good progress. Complete the remaining areas to improve your readiness.'
                  : 'Continue completing your assessments and strengthen your technical skills.'}
            </p>
          </div>
        </section>

        <section style={styles.nextCard}>
          <div>
            <div style={styles.sectionEyebrow}>
              NEXT STEP
            </div>

            <h2 style={styles.nextTitle}>
              Keep building your profile.
            </h2>

            <p style={styles.nextText}>
              Complete any pending assessments to improve
              your placement readiness score.
            </p>
          </div>

          <div style={styles.nextActions}>
            {codingScore === null && (
              <button
                style={styles.actionButton}
                onClick={() =>
                  navigate('/coding-assessment')
                }
              >
                Take coding assessment →
              </button>
            )}

            {interviewScore === null && (
              <button
                style={styles.actionButton}
                onClick={() =>
                  navigate('/interview-room')
                }
              >
                Start AI interview →
              </button>
            )}

            <button
              style={styles.outlineButton}
              onClick={() =>
                navigate('/student-dashboard')
              }
            >
              Back to dashboard
            </button>
          </div>
        </section>
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
    height: 74,
    background: '#081d2b',
    color: '#fff'
  },

  headerInner: {
    height: '100%',
    maxWidth: 1420,
    margin: '0 auto',
    padding: '0 42px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
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

  headerTitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#aab8be',
    fontWeight: 700
  },

  dashboardButton: {
    border: '1px solid #536875',
    background: 'transparent',
    color: '#fff',
    borderRadius: 7,
    padding: '9px 14px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer'
  },

  main: {
    maxWidth: 1420,
    margin: '0 auto',
    padding: '42px 42px 60px',
    boxSizing: 'border-box'
  },

  hero: {
    minHeight: 280,
    background: '#294258',
    borderRadius: 18,
    padding: '40px 45px',
    boxSizing: 'border-box',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 700,
    color: '#aeb9bd',
    marginBottom: 13
  },

  heroTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 50,
    lineHeight: 1.02,
    fontWeight: 500
  },

  heroText: {
    margin: '17px 0 0',
    color: '#c2ccd0',
    fontSize: 14,
    lineHeight: 1.65,
    maxWidth: 560
  },

  heroScore: {
    minWidth: 220,
    textAlign: 'center',
    borderLeft: '1px solid rgba(255,255,255,0.16)',
    paddingLeft: 50
  },

  scoreLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: '#aeb9bd',
    fontWeight: 700
  },

  score: {
    fontFamily: 'Georgia, serif',
    fontSize: 72,
    lineHeight: 1,
    marginTop: 9,
    color: '#f1e5c4'
  },

  scoreUnit: {
    fontSize: 22
  },

  scoreStatus: {
    display: 'inline-block',
    marginTop: 9,
    background: 'rgba(215,184,106,0.16)',
    color: '#e1cb92',
    padding: '6px 11px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 17,
    marginTop: 20
  },

  metricCard: {
    background: '#fffdf8',
    border: '1px solid #ded7cc',
    borderRadius: 14,
    padding: '23px 24px',
    boxSizing: 'border-box'
  },

  metricTop: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#968c80',
    fontWeight: 700
  },

  metricTitle: {
    fontFamily: 'Georgia, serif',
    fontWeight: 500,
    fontSize: 22,
    margin: '22px 0 7px'
  },

  metricValue: {
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    fontWeight: 500,
    color: '#315d6e'
  },

  metricText: {
    color: '#8b847b',
    fontSize: 11,
    margin: '7px 0 0'
  },

  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 0.8fr)',
    gap: 20,
    marginTop: 20
  },

  performanceCard: {
    background: '#fffdf8',
    border: '1px solid #ded7cc',
    borderRadius: 15,
    padding: '28px 30px'
  },

  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25
  },

  sectionEyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: '#948a7e',
    fontWeight: 700
  },

  sectionTitle: {
    margin: '6px 0 0',
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    fontWeight: 500
  },

  statusPill: {
    background: '#e9eee8',
    color: '#426448',
    borderRadius: 20,
    padding: '7px 11px',
    fontSize: 10,
    fontWeight: 700
  },

  performanceItem: {
    marginBottom: 23
  },

  performanceInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9
  },

  performanceInfoDiv: {
    display: 'flex',
    flexDirection: 'column'
  },

  performanceInfoStrong: {
    fontSize: 13
  },

  performanceInfoSpan: {
    color: '#918a81',
    fontSize: 10,
    marginTop: 3
  },

  performanceInfoB: {
    fontSize: 12,
    color: '#315d6e'
  },

  barTrack: {
    height: 8,
    background: '#e4ded4',
    borderRadius: 10,
    overflow: 'hidden'
  },

  barFill: {
    height: '100%',
    background: '#315d6e',
    borderRadius: 10,
    transition: 'width 0.4s ease'
  },

  readinessCard: {
    background: '#e9e4d9',
    borderRadius: 15,
    padding: '28px 30px',
    textAlign: 'center'
  },

  readinessTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 27,
    fontWeight: 500,
    margin: '8px 0 20px'
  },

  circle: {
    width: 145,
    height: 145,
    margin: '0 auto',
    borderRadius: '50%',
    background: '#fffdf8',
    border: '8px solid #315d6e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },

  circleValue: {
    display: 'flex',
    alignItems: 'baseline'
  },

  circleStrong: {
    fontFamily: 'Georgia, serif',
    fontSize: 42,
    fontWeight: 500
  },

  circleSpan: {
    fontSize: 15,
    color: '#6e7778'
  },

  readinessText: {
    color: '#777169',
    fontSize: 11,
    lineHeight: 1.6,
    margin: '19px auto 0',
    maxWidth: 280
  },

  nextCard: {
    marginTop: 20,
    background: '#081d2b',
    color: '#fff',
    borderRadius: 15,
    padding: '28px 30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 30
  },

  nextTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    fontWeight: 500,
    margin: '6px 0'
  },

  nextText: {
    color: '#b9c5ca',
    fontSize: 11,
    margin: 0
  },

  nextActions: {
    display: 'flex',
    gap: 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },

  actionButton: {
    height: 43,
    padding: '0 16px',
    border: 'none',
    borderRadius: 7,
    background: '#d7b86a',
    color: '#173447',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer'
  },

  outlineButton: {
    height: 43,
    padding: '0 16px',
    border: '1px solid #536875',
    borderRadius: 7,
    background: 'transparent',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer'
  },

  primaryButton: {
    height: 47,
    padding: '0 20px',
    border: 'none',
    borderRadius: 8,
    background: '#17394b',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer'
  },

  loadingPage: {
    minHeight: '100vh',
    background: '#f4f0e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  loadingCard: {
    background: '#fffdf8',
    border: '1px solid #ddd5c9',
    borderRadius: 18,
    padding: '50px',
    textAlign: 'center'
  },

  loadingLogo: {
    width: 55,
    height: 55,
    borderRadius: 14,
    background: '#17394b',
    color: '#d7b86a',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    fontSize: 27
  },

  loadingTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    fontWeight: 500
  },

  loadingText: {
    color: '#817a71',
    fontSize: 12
  },

  errorCard: {
    width: 420,
    maxWidth: '90%',
    background: '#fffdf8',
    border: '1px solid #ddd5c9',
    borderRadius: 17,
    padding: 40,
    textAlign: 'center'
  },

  errorIcon: {
    width: 50,
    height: 50,
    borderRadius: '50%',
    background: '#f0dddd',
    color: '#963e3e',
    margin: '0 auto 15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 700
  },

  errorTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    fontWeight: 500
  },

  errorText: {
    color: '#777269',
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 22
  }
};