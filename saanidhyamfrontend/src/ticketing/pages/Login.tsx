import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { error } = await login(username, password);

      if (error) {
        setErrorMessage(error.message || 'Login failed.');
        return;
      }

      navigate('/');
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex w-full z-50 bg-white">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-16 overflow-y-auto h-full bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center gap-3 mb-8 justify-center lg:justify-start">
              <img
                src="/logo.webp"
                alt="Satoru Foundation"
                className="h-16 w-auto object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Satoru Portal
            </h2>
            <p className="text-slate-500 mt-2">
              Sign in to access Search & Ticketing.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 mt-8"
            autoComplete="off"
          >
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMessage('');
              }}
              placeholder="Enter your username"
              autoComplete="off"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage('');
              }}
              placeholder=""
              autoComplete="new-password"
            />

            <Button
              type="submit"
              className="w-full bg-[#4a5838] hover:bg-[#3b462d] text-white font-bold shadow-lg"
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>

            {/* 🔴 Error Message */}
            {errorMessage && (
              <p className="text-sm text-red-600 text-center mt-2">
                {errorMessage}
              </p>
            )}
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            <p>Authorized Personnel Only.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&q=80&w=2000"
          alt="Senior Care"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#4a5838] opacity-60 mix-blend-multiply" />

        <div className="relative z-10 flex flex-col justify-end p-16 h-full w-full">
          <blockquote className="text-white space-y-6 max-w-lg">
            <p className="text-2xl font-light italic leading-relaxed">
              "We don't just add years to life, we add life to years."
            </p>
            <footer className="text-sm font-medium text-yellow-400 tracking-wider uppercase">
              — Satoru Foundation
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};
