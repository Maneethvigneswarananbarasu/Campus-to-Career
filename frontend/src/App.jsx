import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import StudentLogin from './pages/StudentLogin';
import OfficerLogin from './pages/OfficerLogin';
import StudentDashboard from './pages/StudentDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import InterviewRoom from './pages/InterviewRoom';
import CodingAssessment from './pages/CodingAssessment';
import StudentResult from './pages/StudentResult';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/student-login" />} />
        <Route path="/login" element={<Navigate to="/student-login" />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/officer-login" element={<OfficerLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/student-results" element={<StudentResult />} />
        <Route path="/officer-dashboard" element={<OfficerDashboard />} />
        <Route path="/interview-room" element={<InterviewRoom />} />
        <Route path="/coding-assessment" element={<CodingAssessment />} />
      </Routes>
    </Router>
  );
}