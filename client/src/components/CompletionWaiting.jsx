import { CheckCircle } from 'lucide-react';

export default function CompletionWaiting() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-6 py-12">
      <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
      <h1 className="mb-3 text-center text-2xl font-bold">Great job!</h1>
      <p className="max-w-sm text-center text-gray-600">
        You completed the game. Please wait for the moderator to reveal your team color.
      </p>
    </div>
  );
}
