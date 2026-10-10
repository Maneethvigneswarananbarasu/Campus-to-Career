import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [message, setMessage] = useState('');

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
      loadDashboard(parsedUser.id);
    } catch {
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [navigate]);

  const loadDashboard = async (userId) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/student/${userId}/dashboard`
      );

      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error(error);
      setMessage('Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile || !user) {
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', resumeFile);

      const response = await fetch(
        `${API_URL}/api/upload-resume?user_id=${user.id}`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Resume upload failed');
      }

      setMessage('Resume uploaded successfully.');
      setResumeFile(null);

      await loadDashboard(user.id);
    } catch (error) {
      console.error(error);
      setMessage('Unable to upload your resume.');
    } finally {
      setUploading(false);
    }
  };

  const getResumeStatus = () => {
    if (!dashboard) {
      return 'Not uploaded';
    }

    if (
      dashboard.resume?.filename ||
      dashboard.resume_filename ||
      dashboard.resume?.status === 'Uploaded' ||
      dashboard.resume_status === 'Uploaded'
    ) {
      return 'Uploaded';
    }

    return 'Not uploaded';
  };

  const getResumeFilename = () => {
    return (
      dashboard?.resume?.filename ||
      dashboard?.resume_filename ||
      ''
    );
  };

  const getCodingScore = () => {
    const value =
      dashboard?.coding?.score ??
      dashboard?.coding_score ??
      0;

    if (
      value === null ||
      value === undefined ||
      value === '' ||
      value === 'Pending'
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isNaN(number) ? null : number;
  };

  const getInterviewScore = () => {
    const value =
      dashboard?.interview?.numeric_score ??
      dashboard?.interview?.score ??
      dashboard?.interview_score;

    if (
      value === null ||
      value === undefined ||
      value === '' ||
      value === 'Pending'
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isNaN(number) ? null : number;
  };

  const getReadinessScore = () => {
    const value =
      dashboard?.readiness?.score ??
      dashboard?.readiness_score ??
      0;

    const number = Number(value);

    return Number.isNaN(number) ? 0 : number;
  };

  const getReadinessLabel = () => {
    return (
      dashboard?.readiness?.label ||
      dashboard?.readiness_label ||
      'In Progress'
    );
  };

  const codingScore = getCodingScore();
  const interviewScore = getInterviewScore();
  const readinessScore = getReadinessScore();
  const readinessLabel = getReadinessLabel();
  const resumeStatus = getResumeStatus();
  const resumeFilename = getResumeFilename();

  const codingCompleted = codingScore !== null;
  const interviewCompleted = interviewScore !== null;
  const resumeCompleted = resumeStatus === 'Uploaded';

  const studentName =
    dashboard?.user?.full_name ||
    dashboard?.full_name ||
    user?.full_name ||
    'Student';

  const studentEmail =
    dashboard?.user?.email ||
    dashboard?.email ||
    user?.email ||
    '';

  const firstLetter = studentName
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingLogo}>→</div>
          <h2>Campus→Career</h2>
          <p>Preparing your placement workspace...</p>
        </div>
      </div>
    );
  }

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
              style={{
                ...styles.navItem,
                ...styles.activeNav
              }}
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
                document
                  .getElementById('resume-section')
                  ?.scrollIntoView({
                    behavior: 'smooth'
                  })
              }
            >
              <span style={styles.navIcon}>▤</span>
              <span style={styles.metricSpan}>Resume</span>
              <span style={styles.navNumber}>02</span>
            </button>

            <button
              style={styles.navItem}
              onClick={() =>
                navigate('/coding-assessment')
              }
            >
              <span style={styles.navIcon}>
                &lt;/&gt;
              </span>
              <span style={styles.metricSpan}>Coding</span>
              <span style={styles.navNumber}>03</span>
            </button>

            <button
              style={styles.navItem}
              onClick={() =>
                navigate('/interview-room')
              }
            >
              <span style={styles.navIcon}>◉</span>
              <span style={styles.metricSpan}>Interview</span>
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
            <div style={styles.cohortTop}>
              <span style={styles.cohortDot} />
              PLACEMENT 2025–26
            </div>

            <div style={styles.cohortDescription}>
              Your progress is shared with the
              placement office.
            </div>
          </div>

          <div style={styles.sidebarBottom}>
            <div style={styles.email}>
              {studentEmail}
            </div>

            <button
              style={styles.signOut}
              onClick={handleLogout}
            >
              <span style={styles.signOutIcon}>
                ↪
              </span>

              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div style={styles.breadcrumb}>
            <span>Campus to Career</span>
            <span>/</span>
            <strong>Student portal</strong>
          </div>

          <div style={styles.topbarRight}>
            <div style={styles.liveBadge}>
              <span style={styles.liveDot} />
              Live cohort
            </div>

            <div style={styles.profileCircle}>
              {firstLetter}
            </div>

            <div style={styles.profileInfo}>
              <strong>{studentName}</strong>
              <span>Student workspace</span>
            </div>
          </div>
        </header>

        <div style={styles.content}>
          <section style={styles.hero}>
            <div style={styles.heroDecor}>
              YOUR OWN PACE
            </div>

            <div style={styles.heroMain}>
              <div style={styles.heroEyebrow}>
                STUDENT WORKSPACE / PLACEMENT 2025–26
              </div>

              <h1 style={styles.heroTitle}>
                Your next chapter
                <br />
                <em style={styles.heroTitleEm}>starts with progress.</em>
              </h1>

              <p style={styles.heroText}>
                A clear view of what you've done,
                what's next,
                <br />
                and how ready you are to take the next
                step.
              </p>
            </div>

            <div style={styles.heroReadiness}>
              <span>READINESS</span>

              <strong>{readinessScore}</strong>

              <small>/100</small>
            </div>
          </section>

          <section style={styles.profileSection}>
            <div style={styles.studentIdentity}>
              <div style={styles.largeAvatar}>
                {firstLetter}
              </div>

              <div>
                <div style={styles.welcome}>
                  WELCOME BACK
                </div>

                <h2 style={styles.studentName}>
                  {studentName}
                </h2>

                <p style={styles.studentMeta}>
                  Software Engineering · Class of 2026
                </p>
              </div>
            </div>

            <div style={styles.profileReadiness}>
              <span style={styles.profileReadinessSpan}>READINESS</span>

              <div style={styles.profileReadinessDiv}>
                <strong style={styles.profileReadinessStrong}>{readinessScore}</strong>
                <small style={styles.profileReadinessSmall}>/100</small>
              </div>

              <em style={styles.profileReadinessEm}>{readinessLabel}</em>
            </div>
          </section>

          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}

          <section style={styles.snapshot}>
            <div style={styles.snapshotHeader}>
              <div>
                <span style={styles.sectionLabel}>
                  YOUR READINESS SNAPSHOT
                </span>

                <h2 style={styles.snapshotTitle}>
                  Every step adds up.
                </h2>
              </div>

              <div style={styles.snapshotScore}>
                {readinessScore}
                <span style={styles.snapshotScoreSpan}>/ 100</span>
              </div>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${Math.min(
                    Math.max(readinessScore, 0),
                    100
                  )}%`
                }}
              />
            </div>

            <div style={styles.legend}>
              <span>
                <i
                  style={{
                    ...styles.legendDot,
                    background: '#d7a451'
                  }}
                />
                Resume
              </span>

              <span>
                <i
                  style={{
                    ...styles.legendDot,
                    background: '#5f788b'
                  }}
                />
                Coding
              </span>

              <span>
                <i
                  style={{
                    ...styles.legendDot,
                    background: '#71947c'
                  }}
                />
                Interview
              </span>
            </div>

            <div style={styles.metrics}>
              <div style={styles.metric}>
                <div style={styles.metricIcon}>
                  ▤
                </div>

                <div>
                  <span style={styles.metricSpan}>Resume</span>

                  <strong style={styles.metricStrong}>
                    {resumeCompleted ? '20' : '0'}
                    <small style={styles.metricSmall}>/20</small>
                  </strong>

                  <p style={styles.metricText}>
                    {resumeCompleted
                      ? 'Resume uploaded'
                      : 'Upload your resume'}
                  </p>
                </div>
              </div>

              <div style={styles.metric}>
                <div style={styles.metricIcon}>
                  &lt;/&gt;
                </div>

                <div>
                  <span style={styles.metricSpan}>Coding</span>

                  <strong style={styles.metricStrong}>
                    {codingScore !== null
                      ? codingScore
                      : '—'}
                    {codingScore !== null && (
                      <small style={styles.metricSmall}>/100</small>
                    )}
                  </strong>

                  <p style={styles.metricText}>
                    {codingCompleted
                      ? 'Assessment completed'
                      : 'Assessment to complete'}
                  </p>
                </div>
              </div>

              <div style={styles.metric}>
                <div style={styles.metricIcon}>
                  ◉
                </div>

                <div>
                  <span style={styles.metricSpan}>Interview</span>

                  <strong style={styles.metricStrong}>
                    {interviewScore !== null
                      ? interviewScore
                      : '—'}
                    {interviewScore !== null && (
                      <small style={styles.metricSmall}>/10</small>
                    )}
                  </strong>

                  <p style={styles.metricText}>
                    {interviewCompleted
                      ? 'Interview completed'
                      : 'Assessment to complete'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section style={styles.actionSection}>
            <div style={styles.actionHeader}>
              <div>
                <span style={styles.sectionLabel}>
                  YOUR ACTION PLAN
                </span>

                <h2 style={styles.actionTitle}>
                  Keep the momentum.
                </h2>
              </div>

              <span style={styles.actionHint}>
                Small steps. Real progress.
              </span>
            </div>

            <div style={styles.actionGrid}>
              <div style={styles.actionCard}>
                <div style={styles.actionIcon}>
                  &lt;/&gt;
                </div>

                <div style={styles.actionNumber}>
                  01
                </div>

                <div style={styles.actionStatus}>
                  <span
                    style={{
                      ...styles.statusDot,
                      background: codingCompleted
                        ? '#71947c'
                        : '#d2b06e'
                    }}
                  />

                  {codingCompleted
                    ? 'Completed'
                    : 'In progress'}
                </div>

                <h3 style={styles.actionCardTitle}>
                  Coding assessment
                </h3>

                <p style={styles.actionCardText}>
                  Show how you think through a
                  technical problem.
                </p>

                <button
                  style={styles.actionLink}
                  onClick={() =>
                    navigate('/coding-assessment')
                  }
                >
                  {codingCompleted
                    ? 'View assessment'
                    : 'Open assessment'}
                  <span>→</span>
                </button>
              </div>

              <div style={styles.actionCard}>
                <div
                  style={{
                    ...styles.actionIcon,
                    background: '#eef1ed',
                    color: '#62806d'
                  }}
                >
                  ◉
                </div>

                <div style={styles.actionNumber}>
                  02
                </div>

                <div style={styles.actionStatus}>
                  <span
                    style={{
                      ...styles.statusDot,
                      background: interviewCompleted
                        ? '#71947c'
                        : '#d2b06e'
                    }}
                  />

                  {interviewCompleted
                    ? 'Completed'
                    : 'Ready when you are'}
                </div>

                <h3 style={styles.actionCardTitle}>
                  Interview practice
                </h3>

                <p style={styles.actionCardText}>
                  Practice communicating your
                  strengths clearly.
                </p>

                <button
                  style={styles.actionLink}
                  onClick={() =>
                    navigate('/interview-room')
                  }
                >
                  {interviewCompleted
                    ? 'View interview'
                    : 'Open assessment'}
                  <span>→</span>
                </button>
              </div>

              <div
                id="resume-section"
                style={styles.actionCard}
              >
                <div
                  style={{
                    ...styles.actionIcon,
                    background: '#f4eee3',
                    color: '#987345'
                  }}
                >
                  ▤
                </div>

                <div style={styles.actionNumber}>
                  03
                </div>

                <div style={styles.actionStatus}>
                  <span
                    style={{
                      ...styles.statusDot,
                      background: resumeCompleted
                        ? '#71947c'
                        : '#d2b06e'
                    }}
                  />

                  {resumeCompleted
                    ? 'Uploaded'
                    : 'Required'}
                </div>

                <h3 style={styles.actionCardTitle}>
                  Resume profile
                </h3>

                <p style={styles.actionCardText}>
                  Keep your profile and resume ready
                  for placement review.
                </p>

                <label style={styles.uploadLink}>
                  {uploading
                    ? 'Uploading...'
                    : resumeCompleted
                      ? 'Replace resume'
                      : 'Upload resume'}
                  <span>↑</span>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={styles.hiddenInput}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      if (file) {
                        setResumeFile(file);
                      }
                    }}
                  />
                </label>

                {resumeFile && (
                  <button
                    style={styles.uploadConfirm}
                    onClick={handleResumeUpload}
                    disabled={uploading}
                  >
                    {uploading
                      ? 'Uploading...'
                      : 'Confirm upload'}
                  </button>
                )}

                {resumeFilename && (
                  <div style={styles.filename}>
                    {resumeFilename}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section style={styles.shareCard}>
            <div style={styles.shareIcon}>
              ✓
            </div>

            <div>
              <strong style={styles.shareCardStrong}>
                Your progress is shared with your
                placement office.
              </strong>

              <p style={styles.shareCardText}>
                Your answers are scored against the
                assessment prompts, and feedback stays
                attached to your record.
              </p>
            </div>

            <span style={styles.updated}>
              UPDATED JUST NOW
            </span>
          </section>

          <footer style={styles.footer}>
            <span>Campus to Career</span>

            <span>
              Placement records · 2025–26
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#f7f4ed',
    color: '#24394b',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f7f4ed'
  },

  loadingCard: {
    textAlign: 'center',
    color: '#263c4e'
  },

  loadingLogo: {
    width: '48px',
    height: '48px',
    margin: '0 auto 15px',
    borderRadius: '12px',
    background: '#e3b65f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '25px'
  },

  sidebar: {
    width: '230px',
    minHeight: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    background: '#081d2b',
    color: '#fff',
    padding: '28px 15px 20px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 12px'
  },

  brandIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '9px',
    background: '#e3b65f',
    color: '#0a1e2c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '20px'
  },

  brandName: {
    fontFamily: 'Georgia, serif',
    fontSize: '20px',
    fontWeight: '700',
    color: '#f5f1e9'
  },

  brandSubtitle: {
    marginTop: '4px',
    fontSize: '8px',
    letterSpacing: '1.6px',
    color: '#80919b'
  },

  divider: {
    height: '1px',
    background: '#233746',
    margin: '28px 12px'
  },

  workspaceLabel: {
    margin: '0 13px 12px',
    fontSize: '9px',
    letterSpacing: '2px',
    color: '#788b96'
  },

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },

  navItem: {
    width: '100%',
    border: '0',
    background: 'transparent',
    color: '#b9c4ca',
    padding: '13px 13px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '13px',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left'
  },

  activeNav: {
    background: '#1b3243',
    color: '#f8f5ee',
    boxShadow: 'inset 0 0 0 1px #dedbd2'
  },

  navIcon: {
    width: '20px',
    fontSize: '16px'
  },

  navNumber: {
    marginLeft: 'auto',
    fontSize: '9px',
    color: '#718792',
    letterSpacing: '1px'
  },

  cohortCard: {
    margin: '0 6px 20px',
    padding: '16px',
    border: '1px solid #294151',
    background: '#102838',
    borderRadius: '10px'
  },

  cohortTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#d6d9d7',
    fontSize: '8px',
    letterSpacing: '1.4px'
  },

  cohortDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#7fa184'
  },

  cohortDescription: {
    color: '#a4b3ba',
    fontSize: '10px',
    lineHeight: '1.5',
    marginTop: '9px'
  },

  sidebarBottom: {
    borderTop: '1px solid #293d4a',
    padding: '18px 12px 0'
  },

  email: {
    color: '#d8a64f',
    fontSize: '11px',
    marginBottom: '18px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  signOut: {
    border: 0,
    background: 'transparent',
    color: '#d2d9dc',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: 0,
    fontSize: '15px',
    cursor: 'pointer'
  },

  signOutIcon: {
    fontSize: '20px'
  },

  main: {
    marginLeft: '230px',
    minHeight: '100vh',
    width: 'calc(100% - 230px)'
  },

  topbar: {
    height: '70px',
    padding: '0 48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #dfdbd2',
    background: '#f9f7f1',
    boxSizing: 'border-box'
  },

  breadcrumb: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    color: '#7d8b93',
    fontSize: '11px'
  },

  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  liveBadge: {
    border: '1px solid #d5e0d4',
    background: '#f1f6ef',
    color: '#58715d',
    padding: '9px 13px',
    borderRadius: '20px',
    fontSize: '10px'
  },

  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#7fa282',
    display: 'inline-block',
    marginRight: '6px'
  },

  profileCircle: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: '#eadfc9',
    color: '#765f3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px'
  },

  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    fontSize: '10px',
    color: '#24394b'
  },

  content: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '42px 55px 35px',
    boxSizing: 'border-box'
  },

  hero: {
    minHeight: '285px',
    background: '#294258',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '42px 55px',
    boxSizing: 'border-box',
    color: '#f8f4eb'
  },

  heroDecor: {
    position: 'absolute',
    right: '42px',
    top: '58px',
    transform: 'rotate(-10deg)',
    color: '#718395',
    fontSize: '11px',
    letterSpacing: '2px'
  },

  heroMain: {
    textAlign: 'center',
    position: 'relative',
    zIndex: 2
  },

  heroEyebrow: {
    fontSize: '9px',
    letterSpacing: '2px',
    color: '#c9d1d2',
    marginBottom: '16px'
  },

  heroTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '48px',
    lineHeight: '0.98',
    letterSpacing: '-2px',
    margin: 0,
    color: '#f7f3eb'
  },

  heroTitleEm: {
    fontStyle: 'italic',
    color: '#e2ad53'
  },

  heroText: {
    color: '#d0d8da',
    fontSize: '13px',
    lineHeight: '1.55',
    marginTop: '18px'
  },

  heroReadiness: {
    position: 'absolute',
    right: '42px',
    bottom: '42px',
    width: '145px',
    height: '94px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.09)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },

  profileSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: '32px 4px'
  },

  studentIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px'
  },

  largeAvatar: {
    width: '58px',
    height: '58px',
    borderRadius: '50%',
    background: '#e8eee5',
    color: '#61746c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  },

  welcome: {
    color: '#9a9a92',
    letterSpacing: '1.8px',
    fontSize: '8px',
    marginBottom: '6px'
  },

  studentName: {
    fontFamily: 'Georgia, serif',
    fontSize: '27px',
    fontWeight: '400',
    margin: 0,
    color: '#233b4d'
  },

  studentMeta: {
    color: '#788894',
    fontSize: '11px',
    margin: '6px 0 0'
  },

  profileReadiness: {
    minWidth: '145px',
    background: '#f2f5f3',
    borderRadius: '10px',
    padding: '15px 20px',
    textAlign: 'center'
  },

  profileReadinessSpan: {
    fontSize: '8px',
    letterSpacing: '1.5px',
    color: '#87918d'
  },

  profileReadinessDiv: {
    marginTop: '4px'
  },

  profileReadinessStrong: {
    fontFamily: 'Georgia, serif',
    fontSize: '28px',
    color: '#243c4d'
  },

  profileReadinessSmall: {
    fontSize: '11px',
    color: '#7e8b91'
  },

  profileReadinessEm: {
    display: 'block',
    marginTop: '4px',
    fontSize: '9px',
    color: '#71837a',
    fontStyle: 'normal'
  },

  message: {
    background: '#edf4eb',
    border: '1px solid #d9e5d6',
    color: '#5e7564',
    borderRadius: '8px',
    padding: '12px 15px',
    marginBottom: '20px',
    fontSize: '11px'
  },

  snapshot: {
    background: '#fcfbf7',
    border: '1px solid #dedbd2',
    borderRadius: '12px',
    padding: '30px 32px',
    boxSizing: 'border-box'
  },

  snapshotHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },

  sectionLabel: {
    fontSize: '8px',
    letterSpacing: '2px',
    color: '#999a92'
  },

  snapshotTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '25px',
    fontWeight: '400',
    margin: '9px 0 0',
    color: '#2b4051'
  },

  snapshotScore: {
    fontFamily: 'Georgia, serif',
    fontSize: '28px',
    color: '#243a4c'
  },

  snapshotScoreSpan: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    color: '#79878e'
  },

  progressTrack: {
    height: '7px',
    background: '#e8e5dc',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '22px'
  },

  progressFill: {
    height: '100%',
    background: '#6f8d7b',
    borderRadius: '10px',
    transition: 'width 0.4s ease'
  },

  legend: {
    display: 'flex',
    gap: '22px',
    marginTop: '13px',
    fontSize: '9px',
    color: '#76838a'
  },

  legendDot: {
    width: '6px',
    height: '6px',
    display: 'inline-block',
    borderRadius: '50%',
    marginRight: '6px'
  },

  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    marginTop: '22px',
    borderTop: '1px solid #e5e1d8'
  },

  metric: {
    display: 'flex',
    gap: '14px',
    padding: '22px 18px 5px 0',
    borderRight: '1px solid #e5e1d8'
  },

  metricIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '7px',
    background: '#f1f1ec',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#607580',
    fontSize: '12px'
  },

  metricSpan: {
    display: 'block',
    color: '#74828a',
    fontSize: '10px',
    marginBottom: '6px'
  },

  metricStrong: {
    fontFamily: 'Georgia, serif',
    fontSize: '24px',
    fontWeight: '400',
    color: '#263d4e'
  },

  metricSmall: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '10px',
    color: '#899399'
  },

  metricText: {
    color: '#8a9292',
    fontSize: '9px',
    margin: '5px 0 0'
  },

  actionSection: {
    marginTop: '38px'
  },

  actionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '17px'
  },

  actionTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '25px',
    fontWeight: '400',
    color: '#2c4252',
    margin: '8px 0 0'
  },

  actionHint: {
    fontSize: '9px',
    color: '#969992'
  },

  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px'
  },

  actionCard: {
    background: '#fcfbf7',
    border: '1px solid #dedbd2',
    borderRadius: '11px',
    padding: '22px',
    position: 'relative',
    minHeight: '225px',
    boxSizing: 'border-box'
  },

  actionIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    background: '#edf1f1',
    color: '#55717e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px'
  },

  actionNumber: {
    position: 'absolute',
    right: '20px',
    top: '20px',
    color: '#aaa9a1',
    fontSize: '8px',
    letterSpacing: '1px'
  },

  actionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '18px',
    color: '#8a918e',
    fontSize: '9px'
  },

  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%'
  },

  actionCardTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: '20px',
    fontWeight: '400',
    color: '#304657',
    margin: '10px 0 0'
  },

  actionCardText: {
    color: '#7b888d',
    fontSize: '10px',
    lineHeight: '1.6',
    margin: '8px 0 15px',
    maxWidth: '280px'
  },

  actionLink: {
    border: 0,
    background: 'transparent',
    color: '#304d5e',
    padding: 0,
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  uploadLink: {
    color: '#304d5e',
    fontSize: '10px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    width: 'fit-content'
  },

  hiddenInput: {
    display: 'none'
  },

  uploadConfirm: {
    marginTop: '9px',
    border: 0,
    background: '#20394b',
    color: '#fff',
    padding: '7px 10px',
    borderRadius: '5px',
    fontSize: '8px',
    cursor: 'pointer'
  },

  filename: {
    marginTop: '8px',
    fontSize: '8px',
    color: '#8a918e',
    maxWidth: '210px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },

  shareCard: {
    marginTop: '20px',
    border: '1px solid #dce4d9',
    background: '#f0f5ee',
    borderRadius: '9px',
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '13px'
  },

  shareIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '7px',
    background: '#e0ebde',
    color: '#628068',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  shareCardStrong: {
    fontSize: '10px',
    color: '#607265'
  },

  shareCardText: {
    margin: '4px 0 0',
    fontSize: '9px',
    color: '#829084'
  },

  updated: {
    marginLeft: 'auto',
    fontSize: '7px',
    color: '#98a098',
    letterSpacing: '1px'
  },

  footer: {
    marginTop: '35px',
    paddingTop: '15px',
    borderTop: '1px solid #dfdcd4',
    display: 'flex',
    justifyContent: 'space-between',
    color: '#a1a19b',
    fontSize: '8px'
  }
};