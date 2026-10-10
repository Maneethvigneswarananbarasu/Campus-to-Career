import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

export default function OfficerLogin() {
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
       */
      const loggedInUser = data.user || data;

      const role = loggedInUser.role
        ?.toLowerCase()
        .trim();

      console.log('Logged in user:', loggedInUser);
      console.log('Logged in role:', role);

      /*
       * Both of these are officer roles in your database:
       *
       * officer
       * placement_officer
       *
       * So both are allowed to enter the Officer Portal.
       */
      if (
        role !== 'officer' &&
        role !== 'placement_officer'
      ) {
        setError(
          'This account belongs to a student. Please use the Student Login.'
        );
        return;
      }

      /*
       * Store the actual user object.
       */
      localStorage.setItem(
        'user',
        JSON.stringify(loggedInUser)
      );

      /*
       * Go to Officer Dashboard.
       */
      navigate('/officer-dashboard');

    } catch (err) {
      console.error('Officer login error:', err);

      setError(
        err.message || 'Unable to login'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      <div style={styles.card}>

        {/* BRAND */}
        <div style={styles.logoRow}>

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

        {/* BADGE */}
        <div style={styles.badge}>
          PLACEMENT OFFICER
        </div>

        <h1 style={styles.title}>
          Officer Login
        </h1>

        <p style={styles.subtitle}>
          Access student progress, assessment results
          and placement readiness.
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
            Officer email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="officer@example.com"
            required
            disabled={loading}
            style={styles.input}
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
            disabled={loading}
            style={styles.input}
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
            {loading
              ? 'Signing in...'
              : 'Enter Officer Portal'
            }

            {!loading && (
              <span>
                →
              </span>
            )}
          </button>

        </form>

        {/* SECURITY MESSAGE */}
        <div style={styles.security}>

          <div style={styles.securityIcon}>
            ✓
          </div>

          <div style={styles.securityText}>

            <strong style={styles.securityStrong}>
              Restricted access
            </strong>

            <span style={styles.securitySpan}>
              Only placement officer accounts can access
              this portal.
            </span>

          </div>

        </div>

        {/* STUDENT LOGIN */}
        <div style={styles.studentArea}>

          <span>
            Are you a student?
          </span>

          <button
            type="button"
            onClick={() => navigate('/student-login')}
            style={styles.studentButton}
          >
            Student Login →
          </button>

        </div>

      </div>

      <div style={styles.footer}>
        Campus to Career · Placement Management System
      </div>

    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#081d2b',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    boxSizing: 'border-box',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  card: {
    width: 'min(470px, 100%)',
    background: '#fffdf8',
    borderRadius: 18,
    padding: '43px 45px',
    boxSizing: 'border-box',
    boxShadow: '0 25px 70px rgba(0,0,0,0.25)'
  },

  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    marginBottom: 32
  },

  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: '#d7b86a',
    color: '#081d2b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    fontSize: 24,
    fontWeight: 700
  },

  brand: {
    fontFamily: 'Georgia, serif',
    fontSize: 19,
    fontWeight: 700,
    color: '#173447'
  },

  brandSub: {
    fontFamily: 'Georgia, serif',
    fontSize: 13,
    color: '#888077',
    marginTop: 2
  },

  badge: {
    display: 'inline-block',
    background: '#e9e3d7',
    color: '#756344',
    padding: '6px 10px',
    borderRadius: 20,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: 700,
    marginBottom: 14
  },

  title: {
    margin: 0,
    fontFamily: 'Georgia, serif',
    fontSize: 38,
    fontWeight: 500,
    color: '#173447'
  },

  subtitle: {
    margin: '10px 0 27px',
    color: '#7e776e',
    fontSize: 14,
    lineHeight: 1.65
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
    color: '#4d5960',
    marginBottom: 7,
    marginTop: 17
  },

  input: {
    width: '100%',
    height: 49,
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
    height: 51,
    border: 'none',
    borderRadius: 8,
    background: '#17394b',
    color: '#fffdf8',
    marginTop: 27,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },

  security: {
    marginTop: 23,
    background: '#eef2ed',
    border: '1px solid #dce5da',
    borderRadius: 9,
    padding: 13,
    display: 'flex',
    gap: 11,
    alignItems: 'flex-start'
  },

  securityIcon: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#315d3a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    flexShrink: 0
  },

  securityText: {
    minWidth: 0
  },

  securityStrong: {
    display: 'block',
    fontSize: 12,
    color: '#315d3a'
  },

  securitySpan: {
    display: 'block',
    fontSize: 11,
    lineHeight: 1.45,
    color: '#6c786d',
    marginTop: 3
  },

  studentArea: {
    borderTop: '1px solid #eee8de',
    marginTop: 24,
    paddingTop: 19,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    color: '#817a71',
    fontSize: 12
  },

  studentButton: {
    border: 'none',
    background: 'transparent',
    color: '#7c6022',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer'
  },

  footer: {
    marginTop: 20,
    color: '#87959c',
    fontSize: 11
  }
};