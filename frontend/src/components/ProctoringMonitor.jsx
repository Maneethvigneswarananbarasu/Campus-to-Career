import React, { useEffect, useRef, useState } from 'react';

const API_URL = 'http://localhost:8000';

export default function ProctoringMonitor({ userId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  const [warning, setWarning] = useState(null);
  const [status, setStatus] = useState('Starting camera...');
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const [minimized, setMinimized] = useState(false);

  // Determine current student user ID from prop or localStorage
  const currentUserId = (() => {
    if (userId) return userId;
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return u.id || 1;
      }
    } catch {
      // fallback
    }
    return 1;
  })();

  useEffect(() => {
    let stream = null;
    let isMounted = true;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('Camera connected');
        }
      } catch (err) {
        console.error('Webcam access error:', err);
        if (isMounted) {
          setStatus('Camera permission denied');
          setWarning('Camera permission denied or camera not found');
        }
      }
    };

    startCamera();

    const interval = setInterval(() => {
      if (isMounted) {
        captureAndAnalyzeFrame();
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzingRef.current) {
      return;
    }

    const video = videoRef.current;

    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setStatus('Waiting for camera frame...');
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        isAnalyzingRef.current = true;
        try {
          const formData = new FormData();
          formData.append('user_id', String(currentUserId));
          formData.append('frame', blob, 'frame.jpg');

          const res = await fetch(
            `${API_URL}/api/proctor-frame?user_id=${currentUserId}`,
            {
              method: 'POST',
              body: formData
            }
          );

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            setStatus('Server error');
            setWarning(errData.detail || 'Proctoring server error');
            return;
          }

          const data = await res.json();

          if (data.status === 'error') {
            setStatus('Detection error');
            setWarning(data.message || 'Detection failed');
            return;
          }

          setStatus('Monitoring active');
          setPhoneDetected(Boolean(data.phone_detected));
          setPersonCount(data.person_count ?? data.face_count ?? 0);
          setDetectedObjects(data.detected_objects || []);

          if (data.warning) {
            setWarning(data.warning);
          } else {
            setWarning(null);
          }
        } catch (err) {
          console.error('Proctoring frame send failed:', err);
          setStatus('Cannot connect to backend');
          setWarning('Proctoring backend unavailable');
        } finally {
          isAnalyzingRef.current = false;
        }
      },
      'image/jpeg',
      0.7
    );
  };

  if (minimized) {
    return (
      <div
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: warning ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${warning ? '#f87171' : '#86efac'}`,
          color: warning ? '#b91c1c' : '#15803d',
          padding: '8px 14px',
          borderRadius: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        <span>{warning ? '⚠️' : '🟢'}</span>
        <span>{warning ? warning : 'Proctoring Active'}</span>
        <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>▲ Show</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '240px',
        backgroundColor: '#ffffff',
        padding: '12px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        border: warning ? '2px solid #ef4444' : '1px solid #e5e7eb',
        zIndex: 9999,
        transition: 'all 0.2s ease-in-out',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#6b7280'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: warning ? '#ef4444' : '#22c55e',
              display: 'inline-block'
            }}
          />
          <span style={{ fontWeight: '600', color: '#374151' }}>AI Proctor</span>
        </div>

        <button
          onClick={() => setMinimized(true)}
          title="Minimize"
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0 4px',
            lineHeight: 1
          }}
        >
          ─
        </button>
      </div>

      {/* Video Viewport */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '150px',
          backgroundColor: '#111827',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Live Badge */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: '600',
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}
        >
          LIVE
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Warning / Active Banner */}
      <div
        style={{
          marginTop: '10px',
          textAlign: 'center',
          fontWeight: '700',
          fontSize: '12px',
          lineHeight: '1.4',
          color: warning ? '#dc2626' : '#16a34a',
          padding: '6px 8px',
          backgroundColor: warning ? '#fef2f2' : '#f0fdf4',
          borderRadius: '6px',
          border: `1px solid ${warning ? '#fca5a5' : '#bbf7d0'}`
        }}
      >
        {warning ? (
          <div>⚠️ {warning}</div>
        ) : (
          <div>🟢 Proctoring Active</div>
        )}
      </div>

      {/* Proctoring Details */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#6b7280',
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #f3f4f6',
          paddingTop: '6px'
        }}
      >
        <span>
          Person: <strong>{personCount}</strong>
        </span>
        <span>
          Phone:{' '}
          <strong style={{ color: phoneDetected ? '#dc2626' : '#16a34a' }}>
            {phoneDetected ? 'DETECTED' : 'None'}
          </strong>
        </span>
      </div>
    </div>
  );
}