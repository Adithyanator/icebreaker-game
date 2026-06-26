import { Link } from 'react-router-dom';
import { Users, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-blue-light to-white">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-orange shadow-lg">
          <Users className="h-10 w-10 text-white" />
        </div>

        <h1 className="mb-3 text-center text-3xl font-bold text-gray-900">
          U&I Icebreaker Game
        </h1>

        <p className="mb-10 max-w-sm text-center text-gray-600">
          Meet fellow volunteers, find your teammates, and discover your color team!
        </p>

        <div className="w-full max-w-sm space-y-3">
          <Link to="/login" className="btn-primary flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5" />
            Join Game
          </Link>
          <Link to="/admin" className="btn-secondary block text-center">
            Moderator Login
          </Link>
        </div>
      </div>

      <p className="pb-8 text-center text-sm text-gray-400">
        U&I Volunteer Event 2026
      </p>
    </div>
  );
}
