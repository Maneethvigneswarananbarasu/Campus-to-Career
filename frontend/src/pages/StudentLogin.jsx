import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

export default function StudentLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'Invalid email or password'
        );
      }

      /*
       * Your backend returns the user inside data.user.
       *
       * Example:
       * {
       *   "user": {
       *      "id": 1,
       *      "email": "...",
       *      "full_name": "...",
       *      "role": "student"
       *   }
       * }
       *
       * data.user || data also makes this work
       * if the backend ever returns the user directly.
       */
      const loggedInUser = data.user || data;

      const role = loggedInUser.role
        ?.toLowerCase()
        .trim();

      console.log('Logged in user:', loggedInUser);
      console.log('Logged in role:', role);

      /*
       * Only students can enter Student Login.
       */
      if (role !== 'student') {
        setError(
          'This account belongs to an officer. Please use the Officer Login.'
        );
        return;
      }

      /*
       * Store only the actual user object.
       */
      localStorage.setItem(
        'user',
        JSON.stringify(loggedInUser)
      );

      /*
       * Go to Student Dashboard.
       */
      navigate('/student-dashboard');

    } catch (err) {
      console.error('Student login error:', err);

      setError(
        err.message || 'Unable to login'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* LEFT SIDE */}
      <div style={styles.left}>

        {/* BRAND */}
        <div style={styles.brand}>
          <div style={styles.brandMark}>
            C
          </div>

          <div>
            <div style={styles.brandName}>
              Campus
            </div>

            <div style={styles.brandSub}>
              to Career
            </div>
          </div>
        </div>

        {/* LEFT CONTENT */}
        <div style={styles.leftContent}>

          <div style={styles.eyebrow}>
            STUDENT PORTAL
          </div>

          <h1 style={styles.heroTitle}>
            Build your
            <br />
            <em>career</em> with confidence.
          </h1>

          <p style={styles.heroText}>
            Complete your assessments, practice AI interviews,
            showcase your skills and become placement ready.
          </p>

          {/* FEATURES */}
          <div style={styles.features}>

            <div style={styles.feature}>

              <span style={styles.featureNumber}>
                01
              </span>

              <div style={styles.featureText}>

                <strong style={styles.featureStrong}>
                  Upload your resume
                </strong>

                <p style={styles.featureP}>
                  Let your profile speak for your skills.
                </p>

              </div>
            </div>

            <div style={styles.feature}>

              <span style={styles.featureNumber}>
                02
              </span>

              <div style={styles.featureText}>

                <strong style={styles.featureStrong}>
                  Test your coding skills
                </strong>

                <p style={styles.featureP}>
                  Practice real programming assessments.
                </p>

              </div>
            </div>

            <div style={styles.feature}>

              <span style={styles.featureNumber}>
                03
              </span>

              <div style={styles.featureText}>

                <strong style={styles.featureStrong}>
                  Complete AI interviews
                </strong>

                <p style={styles.featureP}>
                  Prepare for real technical interviews.
                </p>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>

        <div style={styles.loginCard}>

          {/* MOBILE BRAND */}
          <div style={styles.mobileBrand}>

            <div style={styles.smallBrandMark}>
              C
            </div>

            <strong>
              Campus to Career
            </strong>

          </div>

          <div style={styles.cardEyebrow}>
            WELCOME BACK
          </div>

          <h2 style={styles.title}>
            Student Login
          </h2>

          <p style={styles.subtitle}>
            Sign in to continue your placement journey.
          </p>

          {/* ERROR */}
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin}>

            <label style={styles.label}>
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="you@example.com"
              required
              style={styles.input}
              disabled={loading}
            />

            <label style={styles.label}>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              required
              style={styles.input}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}

              {!loading && (
                <span>
                  →
                </span>
              )}
            </button>

          </form>

          {/* REGISTER */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>
              NEW TO CAMPUS TO CAREER?
            </span>
          </div>

          <Link
            to="/register"
            style={styles.registerButton}
          >
            Create student account
          </Link>

          {/* OFFICER LOGIN */}
          <div style={styles.officerLink}>

            <span>
              Are you a placement officer?
            </span>

            <button
              type="button"
              onClick={() => navigate('/officer-login')}
              style={styles.switchButton}
            >
              Officer Login →
            </button>

          </div>

        </div>

        <div style={styles.footer}>
          © 2026 Campus to Career
        </div>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '1.05fr 0.95fr',
    background: '#f5f1e9',
    color: '#173447',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  left: {
    background: '#081d2b',
    color: '#f7f3eb',
    padding: '38px 70px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },

  brandMark: {
    width: 45,
    height: 45,
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
    fontWeight: 700
  },

  brandSub: {
    fontFamily: 'Georgia, serif',
    fontSize: 14,
    color: '#aebbc1',
    marginTop: 2
  },

  leftContent: {
    maxWidth: 650,
    margin: 'auto 0'
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#aab7bd',
    fontWeight: 700,
    marginBottom: 18
  },

  heroTitle: {
    fontFamily: 'Georgia, serif',
    fontSize: 57,
    lineHeight: 1.02,
    fontWeight: 500,
    letterSpacing: -1.5,
    margin: 0
  },

  heroText: {
    color: '#b9c5ca',
    fontSize: 16,
    lineHeight: 1.7,
    maxWidth: 540,
    margin: '24px 0 42px'
  },

  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22
  },

  feature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 17
  },

  featureNumber: {
    color: '#d7b86a',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    minWidth: 28
  },

  featureText: {
    minWidth: 0
  },

  featureStrong: {
    display: 'block',
    fontSize: 14,
    color: '#f2eee6'
  },

  featureP: {
    margin: '5px 0 0',
    fontSize: 12,
    color: '#82929b'
  },

  right: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px 55px',
    boxSizing: 'border-box'
  },

  loginCard: {
    width: 'min(460px, 100%)',
    background: '#fffdf8',
    border: '1px solid #e0d9cf',
    borderRadius: 18,
    padding: '42px 43px',
    boxSizing: 'border-box',
    boxShadow: '0 18px 50px rgba(26, 42, 51, 0.08)'
  },

  mobileBrand: {
    display: 'none'
  },

  smallBrandMark: {
    width: 35,
    height: 35,
    borderRadius: 9,
    background: '#d7b86a',
    color: '#081d2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  cardEyebrow: {
    color: '#958c80',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    marginBottom: 10
  },

  title: {
    fontFamily: 'Georgia, serif',
    fontSize: 36,
    fontWeight: 500,
    margin: 0,
    color: '#173447'
  },

  subtitle: {
    color: '#817a71',
    fontSize: 14,
    lineHeight: 1.6,
    margin: '9px 0 28px'
  },

  error: {
    background: '#f4dddd',
    color: '#8a3636',
    border: '1px solid #e3bebe',
    borderRadius: 8,
    padding: '11px 13px',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 1.45,
    textAlign: 'center'
  },

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: '#4c5960',
    marginBottom: 7,
    marginTop: 18
  },

  input: {
    width: '100%',
    height: 48,
    boxSizing: 'border-box',
    border: '1px solid #d9d2c8',
    background: '#faf8f3',
    borderRadius: 8,
    padding: '0 14px',
    fontSize: 14,
    color: '#173447',
    outline: 'none'
  },

  loginButton: {
    width: '100%',
    height: 50,
    marginTop: 26,
    border: 'none',
    borderRadius: 8,
    background: '#17394b',
    color: '#fffdf8',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },

  divider: {
    borderTop: '1px solid #e7e0d6',
    margin: '28px 0 17px',
    textAlign: 'center',
    position: 'relative'
  },

  dividerText: {
    position: 'relative',
    top: -7,
    background: '#fffdf8',
    padding: '0 9px',
    color: '#a29a90',
    fontSize: 9,
    letterSpacing: 1.3
  },

  registerButton: {
    height: 46,
    border: '1px solid #cfc7bc',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#294c60',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700
  },

  officerLink: {
    borderTop: '1px solid #eee8de',
    marginTop: 25,
    paddingTop: 19,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },

  switchButton: {
    border: 'none',
    background: 'transparent',
    color: '#7c6022',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer'
  },

  footer: {
    color: '#938b81',
    fontSize: 11,
    marginTop: 20
  }
};