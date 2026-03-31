import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUser } from './store/slices/authSlice';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import Subscriptions from './pages/Subscriptions';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import VoiceChat from './pages/VoiceChat';
import TalkingAgent from './pages/TalkingAgent';
import ConversationDetail from './pages/ConversationDetail';
import Topics from './pages/Topics';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const { access } = useSelector((state) => state.auth);

  useEffect(() => {
    if (access) {
      dispatch(fetchUser());
    }
  }, [dispatch, access]);

  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <Subscriptions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="topics" element={<Topics />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="conversations/:id" element={<ConversationDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="voice" element={<VoiceChat />} />
          <Route path="talking-agent" element={<TalkingAgent />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
