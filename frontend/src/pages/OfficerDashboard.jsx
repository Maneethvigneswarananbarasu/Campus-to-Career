import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

export default function OfficerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      navigate('/officer-login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== 'officer') {
        localStorage.removeItem('user');
        navigate('/officer-login');
        return;
      }

      setUser(parsedUser);
      loadStudents();
    } catch {
      localStorage.removeItem('user');
      navigate('/officer-login');
    }
  }, [navigate]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/api/students`);

      if (!response.ok) {
        throw new Error('Failed to load students');
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setStudents(data);
      } else if (Array.isArray(data.students)) {
        setStudents(data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load students');
    } finally {
      setLoading(false);
    }
  };

  const refreshStudents = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  const loadStudentDetails = async (studentId) => {
    try {
      setDetailLoading(true);

      const response = await fetch(
        `${API_URL}/api/students/${studentId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load student details');
      }

      const data = await response.json();
      setSelectedStudent(data);
    } catch {
      try {
        const fallback = await fetch(
          `${API_URL}/api/student/${studentId}/results`
        );

        if (fallback.ok) {
          const data = await fallback.json();
          setSelectedStudent(data);
        }
      } catch {
        setError('Unable to load student details');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/officer-login');
  };

  const exportCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/api/officer/export`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'student_results.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to export student data');
    }
  };

  const getStudentName = (student) =>
    student.full_name ||
    student.name ||
    student.student_name ||
    'Unnamed Student';

  const getStudentEmail = (student) =>
    student.email ||
    student.student_email ||
    'No email';

  const getStudentStatus = (student) => {
    if (student.status) return student.status;
    if (student.readiness?.status) return student.readiness.status;
    if (student.overall_status) return student.overall_status;

    const coding = student.coding_score;
    const interview = student.interview_score;

    if (
      coding !== undefined &&
      coding !== null &&
      coding !== 'Pending' &&
      interview !== undefined &&
      interview !== null &&
      interview !== 'Pending'
    ) {
      return 'Completed';
    }

    if (
      coding !== undefined &&
      coding !== null &&
      coding !== 'Pending'
    ) {
      return 'Interview Pending';
    }

    if (
      interview !== undefined &&
      interview !== null &&
      interview !== 'Pending'
    ) {
      return 'Coding Pending';
    }

    return 'Not Started';
  };

  const getCodingScore = (student) => {
    const value =
      student.coding_score ??
      student.codingScore ??
      student.coding?.score;

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === 'Pending'
    ) {
      return 'Pending';
    }

    return value;
  };

  const getInterviewScore = (student) => {
    const value =
      student.interview_score ??
      student.interviewScore ??
      student.interview?.score;

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === 'Pending'
    ) {
      return 'Pending';
    }

    return value;
  };

  const getReadiness = (student) => {
    const value =
      student.readiness_score ??
      student.readinessScore ??
      student.readiness?.score ??
      student.overall_score ??
      student.overallScore;

    if (value === undefined || value === null || value === '') {
      return '—';
    }

    return value;
  };

  const getResumeStatus = (student) => {
    const value =
      student.resume_status ??
      student.resumeStatus ??
      student.resume?.status;

    if (value) return value;

    if (
      student.resume_filename ||
      student.resumeFilename ||
      student.resume
    ) {
      return 'Uploaded';
    }

    return 'Pending';
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const name = getStudentName(student).toLowerCase();
      const email = getStudentEmail(student).toLowerCase();
      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query);

      const status = getStudentStatus(student);

      const matchesStatus =
        statusFilter === 'All' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const stats = useMemo(() => {
    const total = students.length;

    const completed = students.filter(
      (student) => getStudentStatus(student) === 'Completed'
    ).length;

    const inProgress = students.filter((student) => {
      const status = getStudentStatus(student);

      return (
        status === 'Interview Pending' ||
        status === 'Coding Pending'
      );
    }).length;

    const notStarted = students.filter(
      (student) => getStudentStatus(student) === 'Not Started'
    ).length;

    return {
      total,
      completed,
      inProgress,
      notStarted
    };
  }, [students]);

  const getStatusStyle = (status) => {
    if (status === 'Completed') {
      return {
        background: '#dcebdc',
        color: '#315d3a'
      };
    }

    if (
      status === 'Interview Pending' ||
      status === 'Coding Pending'
    ) {
      return {
        background: '#f4ead0',
        color: '#80621d'
      };
    }

    return {
      background: '#e8e5e0',
      color: '#625f59'
    };
  };

  const detailName = selectedStudent
    ? getStudentName(selectedStudent)
    : '';

  const detailEmail = selectedStudent
    ? getStudentEmail(selectedStudent)
    : '';

  const detailCoding = selectedStudent
    ? getCodingScore(selectedStudent)
    : 'Pending';

  const detailInterview = selectedStudent
    ? getInterviewScore(selectedStudent)
    : 'Pending';

  const detailReadiness = selectedStudent
    ? getReadiness(selectedStudent)
    : '—';

  const detailResume = selectedStudent
    ? getResumeStatus(selectedStudent)
    : 'Pending';

  const interviewAnswers =
    selectedStudent?.interview_answers ||
    selectedStudent?.interviewAnswers ||
    selectedStudent?.answers ||
    selectedStudent?.interview?.answers ||
    [];

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brand}>
            <div style={styles.brandMark}>C</div>
            <div>
              <div style={styles.brandName}>Campus</div>
              <div style={styles.brandSub}>to Career</div>
            </div>
          </div>

          <div style={styles.sidebarLabel}>OFFICER PORTAL</div>

          <nav style={styles.nav}>
            <div style={{ ...styles.navItem, ...styles.navActive }}>
              <span style={styles.navIcon}>▦</span>
              Dashboard
            </div>

            <div
              style={styles.navItem}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <span style={styles.navIcon}>◉</span>
              Students
            </div>

            <div
              style={styles.navItem}
              onClick={() =>
                document
                  .getElementById('pipeline')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              <span style={styles.navIcon}>↗</span>
              Placement Pipeline
            </div>
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          <div style={styles.officerBox}>
            <div style={styles.officerAvatar}>
              {(user?.full_name || 'O').charAt(0).toUpperCase()}
            </div>

            <div style={styles.officerInfo}>
              <strong>{user?.full_name || 'Placement Officer'}</strong>
              <span>{user?.email || 'Officer account'}</span>
            </div>
          </div>

          <button style={styles.logoutButton} onClick={handleLogout}>
            <span>↪</span>
            Sign out
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <div style={styles.eyebrow}>PLACEMENT MANAGEMENT</div>
            <h1 style={styles.pageTitle}>Officer Dashboard</h1>
          </div>

          <div style={styles.topActions}>
            <button
              style={styles.refreshButton}
              onClick={refreshStudents}
              disabled={refreshing}
            >
              <span>{refreshing ? '↻' : '⟳'}</span>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button style={styles.exportButton} onClick={exportCSV}>
              <span>↓</span>
              Export CSV
            </button>
          </div>
        </header>

        <section style={styles.content}>
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <section style={styles.hero}>
            <div>
              <div style={styles.heroEyebrow}>
                PLACEMENT OVERVIEW
              </div>

              <h2 style={styles.heroTitle}>
                Student <em>readiness</em><br />
                at a glance.
              </h2>

              <p style={styles.heroText}>
                Monitor student progress across resumes, coding
                assessments and AI interviews from one place.
              </p>
            </div>

            <div style={styles.heroBadge}>
              <div style={styles.heroBadgeNumber}>
                {stats.completed}
              </div>

              <div style={styles.heroBadgeText}>
                placement-ready
                <br />
                students
              </div>
            </div>
          </section>

          <section style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statTop}>
                <span>Total Students</span>
                <div style={styles.statIcon}>◎</div>
              </div>

              <strong>{stats.total}</strong>
              <p>Registered students</p>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statTop}>
                <span>Completed</span>
                <div style={styles.statIcon}>✓</div>
              </div>

              <strong>{stats.completed}</strong>
              <p>Assessment completed</p>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statTop}>
                <span>In Progress</span>
                <div style={styles.statIcon}>◔</div>
              </div>

              <strong>{stats.inProgress}</strong>
              <p>Currently progressing</p>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statTop}>
                <span>Not Started</span>
                <div style={styles.statIcon}>○</div>
              </div>

              <strong>{stats.notStarted}</strong>
              <p>Awaiting assessment</p>
            </div>
          </section>

          <section id="pipeline" style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.sectionEyebrow}>
                  STUDENT MANAGEMENT
                </div>

                <h2 style={styles.sectionTitle}>
                  Placement pipeline
                </h2>

                <p style={styles.sectionDescription}>
                  Search, filter and review every student's progress.
                </p>
              </div>

              <div style={styles.studentCount}>
                {filteredStudents.length} students
              </div>
            </div>

            <div style={styles.toolbar}>
              <div style={styles.searchBox}>
                <span style={styles.searchIcon}>⌕</span>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={styles.searchInput}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="All">All statuses</option>
                <option value="Completed">Completed</option>
                <option value="Interview Pending">
                  Interview Pending
                </option>
                <option value="Coding Pending">
                  Coding Pending
                </option>
                <option value="Not Started">
                  Not Started
                </option>
              </select>
            </div>

            {loading ? (
              <div style={styles.emptyState}>
                <div style={styles.loader}>⟳</div>
                <h3>Loading students...</h3>
                <p>Fetching the latest placement data.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>◎</div>
                <h3>No students found</h3>
                <p>
                  Try changing your search or status filter.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>STUDENT</th>
                      <th>RESUME</th>
                      <th>CODING</th>
                      <th>INTERVIEW</th>
                      <th>READINESS</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const status = getStudentStatus(student);
                      const statusStyle = getStatusStyle(status);

                      return (
                        <tr key={student.id || student.user_id || index}>
                          <td>
                            <div style={styles.studentCell}>
                              <div style={styles.studentAvatar}>
                                {getStudentName(student)
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {getStudentName(student)}
                                </strong>

                                <span>
                                  {getStudentEmail(student)}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.smallStatus,
                                background:
                                  getResumeStatus(student) ===
                                  'Uploaded'
                                    ? '#dcebdc'
                                    : '#eeeae4',
                                color:
                                  getResumeStatus(student) ===
                                  'Uploaded'
                                    ? '#315d3a'
                                    : '#77716a'
                              }}
                            >
                              {getResumeStatus(student)}
                            </span>
                          </td>

                          <td>
                            <strong style={styles.scoreText}>
                              {getCodingScore(student)}
                              {getCodingScore(student) !==
                                'Pending' && '%'}
                            </strong>
                          </td>

                          <td>
                            <strong style={styles.scoreText}>
                              {getInterviewScore(student)}
                              {getInterviewScore(student) !==
                                'Pending' && '%'}
                            </strong>
                          </td>

                          <td>
                            <strong style={styles.readinessText}>
                              {getReadiness(student)}
                              {getReadiness(student) !== '—' &&
                                '%'}
                            </strong>
                          </td>

                          <td>
                            <span
                              style={{
                                ...styles.statusPill,
                                ...statusStyle
                              }}
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            <button
                              style={styles.viewButton}
                              onClick={() =>
                                loadStudentDetails(
                                  student.id || student.user_id
                                )
                              }
                            >
                              View
                              <span>→</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>

      {selectedStudent && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.sectionEyebrow}>
                  STUDENT PROFILE
                </div>

                <h2 style={styles.modalTitle}>
                  {detailName}
                </h2>

                <p style={styles.modalEmail}>
                  {detailEmail}
                </p>
              </div>

              <button
                style={styles.closeButton}
                onClick={() => setSelectedStudent(null)}
              >
                ×
              </button>
            </div>

            {detailLoading ? (
              <div style={styles.modalLoading}>
                Loading student details...
              </div>
            ) : (
              <>
                <div style={styles.detailStats}>
                  <div style={styles.detailStat}>
                    <span>CODING</span>
                    <strong>
                      {detailCoding}
                      {detailCoding !== 'Pending' && '%'}
                    </strong>
                  </div>

                  <div style={styles.detailStat}>
                    <span>INTERVIEW</span>
                    <strong>
                      {detailInterview}
                      {detailInterview !== 'Pending' && '%'}
                    </strong>
                  </div>

                  <div style={styles.detailStat}>
                    <span>READINESS</span>
                    <strong>
                      {detailReadiness}
                      {detailReadiness !== '—' && '%'}
                    </strong>
                  </div>

                  <div style={styles.detailStat}>
                    <span>RESUME</span>
                    <strong style={styles.detailResume}>
                      {detailResume}
                    </strong>
                  </div>
                </div>

                <div style={styles.detailGrid}>
                  <section style={styles.detailPanel}>
                    <div style={styles.detailPanelLabel}>
                      PROFILE
                    </div>

                    <div style={styles.profileRows}>
                      <div>
                        <span>Full name</span>
                        <strong>{detailName}</strong>
                      </div>

                      <div>
                        <span>Email</span>
                        <strong>{detailEmail}</strong>
                      </div>

                      <div>
                        <span>Status</span>
                        <strong>
                          {getStudentStatus(selectedStudent)}
                        </strong>
                      </div>
                    </div>
                  </section>

                  <section style={styles.detailPanel}>
                    <div style={styles.detailPanelLabel}>
                      RESUME
                    </div>

                    <div style={styles.resumeBox}>
                      <div style={styles.resumeIcon}>PDF</div>

                      <div>
                        <strong>
                          {selectedStudent.resume_filename ||
                            selectedStudent.resumeFilename ||
                            'Resume'}
                        </strong>

                        <span>
                          {detailResume}
                        </span>
                      </div>
                    </div>

                    {selectedStudent.resume_text && (
                      <div style={styles.resumePreview}>
                        {selectedStudent.resume_text}
                      </div>
                    )}
                  </section>
                </div>

                <section style={styles.interviewPanel}>
                  <div style={styles.detailPanelLabel}>
                    AI INTERVIEW
                  </div>

                  {interviewAnswers.length === 0 ? (
                    <div style={styles.noAnswers}>
                      No interview answers available.
                    </div>
                  ) : (
                    <div style={styles.answerList}>
                      {interviewAnswers.map((item, index) => (
                        <div
                          key={item.id || index}
                          style={styles.answerCard}
                        >
                          <div style={styles.answerNumber}>
                            Q{item.question_number || index + 1}
                          </div>

                          <div style={styles.answerContent}>
                            <h4>
                              {item.question ||
                                'Interview question'}
                            </h4>

                            <p>
                              {item.answer ||
                                'No answer provided.'}
                            </p>

                            {item.feedback && (
                              <div style={styles.feedbackBox}>
                                <strong>AI Feedback</strong>
                                <span>{item.feedback}</span>
                              </div>
                            )}
                          </div>

                          <div style={styles.answerScore}>
                            {item.score ?? '—'}
                            {item.score !== undefined &&
                              item.score !== null &&
                              '%'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f1e9',
    color: '#142b39',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: 245,
    background: '#081d2b',
    color: '#f5f1e9',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '30px 22px',
    boxSizing: 'border-box',
    zIndex: 10
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 55
  },

  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#d7b86a',
    color: '#081d2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    fontSize: 25,
    fontWeight: 700
  },

  brandName: {
    fontFamily: 'Georgia, serif',
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1
  },

  brandSub: {
    fontFamily: 'Georgia, serif',
    fontSize: 14,
    color: '#b7c2c8',
    marginTop: 4
  },

  sidebarLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#81909a',
    fontWeight: 700,
    marginBottom: 14
  },

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7
  },

  navItem: {
    padding: '14px 15px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    color: '#aebbc1',
    fontSize: 15,
    cursor: 'pointer',
    transition: '0.2s'
  },

  navActive: {
    background: '#173447',
    color: '#f5f1e9'
  },

  navIcon: {
    width: 20,
    textAlign: 'center',
    fontSize: 18
  },

  sidebarBottom: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18
  },

  officerBox: {
    borderTop: '1px solid #29404e',
    paddingTop: 20,
    display: 'flex',
    gap: 11,
    alignItems: 'center'
  },

  officerAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#d7b86a',
    color: '#081d2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 17
  },

  officerInfo: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },

  officerInfoStrong: {
    fontSize: 13
  },

  officerInfoSpan: {
    fontSize: 11,
    color: '#82919a',
    marginTop: 3,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  logoutButton: {
    width: '100%',
    border: '1px solid #29404e',
    background: 'transparent',
    color: '#b8c3c8',
    borderRadius: 9,
    padding: '12px 14px',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer'
  },

  main: {
    marginLeft: 245,
    minHeight: '100vh'
  },

  topbar: {
    height: 86,
    background: '#f8f5ef',
    borderBottom: '1px solid #e3ddd3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 42px',
    boxSizing: 'border-box'
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.2,
    fontWeight: 700,
    color: '#8d8579',
    marginBottom: 5
  },

  pageTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 27,
    fontWeight: 600,
    color: '#142b39'
  },

  topActions: {
    display: 'flex',
    gap: 10
  },

  refreshButton: {
    border: '1px solid #d9d1c5',
    background: '#fffdf8',
    color: '#314552',
    padding: '11px 17px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },

  exportButton: {
    border: 'none',
    background: '#17394b',
    color: '#fffdf8',
    padding: '11px 19px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer'
  },

  content: {
    maxWidth: 1450,
    margin: '0 auto',
    padding: '30px 42px 50px',
    boxSizing: 'border-box'
  },

  errorBox: {
    background: '#f4dede',
    color: '#8b3535',
    border: '1px solid #e4bcbc',
    padding: '13px 16px',
    borderRadius: 9,
    marginBottom: 18,
    fontSize: 14
  },

  hero: {
    background: '#29465a',
    color: '#f7f3eb',
    borderRadius: 18,
    minHeight: 250,
    padding: '35px 42px',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden'
  },

  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 2.4,
    fontWeight: 700,
    color: '#b9c4ca',
    marginBottom: 15
  },

  heroTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 51,
    lineHeight: 1.02,
    fontWeight: 500,
    letterSpacing: -1.3
  },

  heroText: {
    maxWidth: 560,
    color: '#c9d2d6',
    fontSize: 15,
    lineHeight: 1.65,
    margin: '20px 0 0'
  },

  heroBadge: {
    minWidth: 175,
    minHeight: 175,
    borderRadius: '50%',
    background: '#d7b86a',
    color: '#173243',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 25,
    flexShrink: 0
  },

  heroBadgeNumber: {
    fontFamily: 'Georgia, serif',
    fontSize: 52,
    lineHeight: 1
  },

  heroBadgeText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 1.35,
    marginTop: 8,
    fontWeight: 700
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 15,
    margin: '18px 0'
  },

  statCard: {
    background: '#fffdf8',
    border: '1px solid #e3ddd3',
    borderRadius: 13,
    padding: '20px 21px'
  },

  statTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#777168',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },

  statIcon: {
    width: 29,
    height: 29,
    borderRadius: '50%',
    background: '#eee9df',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#45606e',
    fontSize: 15
  },

  statCardStrong: {
    fontFamily: 'Georgia, serif',
    fontSize: 36,
    display: 'block',
    color: '#173447',
    marginTop: 12
  },

  statCardP: {
    margin: '5px 0 0',
    fontSize: 12,
    color: '#8b857c'
  },

  panel: {
    background: '#fffdf8',
    border: '1px solid #e1dbd1',
    borderRadius: 16,
    overflow: 'hidden'
  },

  panelHeader: {
    padding: '25px 28px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },

  sectionEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#9a9185',
    fontWeight: 700,
    marginBottom: 6
  },

  sectionTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 29,
    fontWeight: 500,
    color: '#173447'
  },

  sectionDescription: {
    margin: '7px 0 0',
    color: '#817a71',
    fontSize: 13
  },

  studentCount: {
    background: '#eee9df',
    color: '#625b52',
    padding: '8px 13px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700
  },

  toolbar: {
    display: 'flex',
    gap: 10,
    padding: '0 28px 20px'
  },

  searchBox: {
    flex: 1,
    height: 44,
    border: '1px solid #ddd6cb',
    background: '#faf8f3',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    padding: '0 13px',
    boxSizing: 'border-box'
  },

  searchIcon: {
    fontSize: 21,
    color: '#91897f',
    marginRight: 9
  },

  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    fontSize: 14,
    color: '#263d49'
  },

  filterSelect: {
    height: 44,
    border: '1px solid #ddd6cb',
    background: '#faf8f3',
    borderRadius: 8,
    padding: '0 14px',
    fontSize: 13,
    color: '#455661',
    outline: 'none'
  },

  tableWrapper: {
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 950
  },

  emptyState: {
    padding: '70px 30px',
    textAlign: 'center',
    color: '#777169'
  },

  loader: {
    fontSize: 35,
    color: '#29465a',
    marginBottom: 12
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: '50%',
    background: '#eee9df',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    fontSize: 23
  },

  emptyStateH3: {
    margin: 0,
    color: '#263e4a',
    fontFamily: 'Georgia, serif',
    fontSize: 22
  },

  emptyStateP: {
    fontSize: 13,
    color: '#8a837a'
  },

  studentCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 11
  },

  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: '#dce5e5',
    color: '#29465a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0
  },

  smallStatus: {
    padding: '5px 9px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700
  },

  scoreText: {
    color: '#29465a',
    fontSize: 14
  },

  readinessText: {
    color: '#315d3a',
    fontSize: 14
  },

  statusPill: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap'
  },

  viewButton: {
    border: 'none',
    background: 'transparent',
    color: '#31576b',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8, 29, 43, 0.72)',
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    boxSizing: 'border-box'
  },

  modal: {
    width: 'min(1100px, 100%)',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#f8f5ef',
    borderRadius: 18,
    boxShadow: '0 25px 80px rgba(0,0,0,0.25)'
  },

  modalHeader: {
    padding: '28px 32px',
    borderBottom: '1px solid #ddd6cb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },

  modalTitle: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 34,
    fontWeight: 500,
    color: '#173447'
  },

  modalEmail: {
    margin: '7px 0 0',
    color: '#7d766d',
    fontSize: 14
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    border: '1px solid #d9d1c5',
    background: '#fffdf8',
    fontSize: 24,
    lineHeight: 1,
    color: '#4d5a60',
    cursor: 'pointer'
  },

  modalLoading: {
    padding: 70,
    textAlign: 'center',
    color: '#777169',
    fontSize: 15
  },

  detailStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    padding: '22px 32px'
  },

  detailStat: {
    background: '#fffdf8',
    border: '1px solid #e0d9cf',
    borderRadius: 11,
    padding: '16px 17px'
  },

  detailStatSpan: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: '#918a80',
    fontWeight: 700
  },

  detailStatStrong: {
    display: 'block',
    marginTop: 8,
    fontFamily: 'Georgia, serif',
    fontSize: 27,
    color: '#29465a'
  },

  detailResume: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 16
  },

  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
    padding: '0 32px 14px'
  },

  detailPanel: {
    background: '#fffdf8',
    border: '1px solid #e0d9cf',
    borderRadius: 12,
    padding: 20
  },

  detailPanelLabel: {
    fontSize: 10,
    letterSpacing: 1.7,
    color: '#928a80',
    fontWeight: 700,
    marginBottom: 16
  },

  profileRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 13
  },

  profileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    borderBottom: '1px solid #eee9df',
    paddingBottom: 11
  },

  resumeBox: {
    display: 'flex',
    gap: 13,
    alignItems: 'center'
  },

  resumeIcon: {
    width: 45,
    height: 45,
    borderRadius: 9,
    background: '#e9dfd3',
    color: '#7a4b39',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 800
  },

  resumePreview: {
    marginTop: 16,
    padding: 13,
    background: '#f5f1e9',
    borderRadius: 8,
    maxHeight: 150,
    overflow: 'auto',
    fontSize: 12,
    lineHeight: 1.6,
    color: '#625d56'
  },

  interviewPanel: {
    margin: '0 32px 32px',
    background: '#fffdf8',
    border: '1px solid #e0d9cf',
    borderRadius: 12,
    padding: 20
  },

  noAnswers: {
    background: '#f5f1e9',
    borderRadius: 8,
    padding: 18,
    color: '#7c766e',
    fontSize: 13
  },

  answerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },

  answerCard: {
    display: 'grid',
    gridTemplateColumns: '42px 1fr 55px',
    gap: 14,
    padding: 16,
    borderRadius: 10,
    background: '#f7f3ec',
    border: '1px solid #e6dfd4'
  },

  answerNumber: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#29465a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700
  },

  answerContent: {
    minWidth: 0
  },

  answerContentH4: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 17,
    fontWeight: 500,
    color: '#243d4a'
  },

  answerContentP: {
    margin: '9px 0 0',
    color: '#69635b',
    fontSize: 13,
    lineHeight: 1.6
  },

  feedbackBox: {
    marginTop: 12,
    padding: 11,
    background: '#e7eee7',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },

  answerScore: {
    fontFamily: 'Georgia, serif',
    fontSize: 21,
    color: '#315d3a',
    fontWeight: 600,
    textAlign: 'right'
  }
};