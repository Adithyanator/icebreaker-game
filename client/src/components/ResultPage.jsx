import { TEAM_COLORS } from '../constants';

export default function ResultPage({ volunteer }) {
  const color = volunteer.assignedColor;
  const colorStyle = TEAM_COLORS[color] || TEAM_COLORS.Blue;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div
        className={`w-full max-w-sm rounded-3xl p-10 text-center shadow-xl ${colorStyle.bg} ${colorStyle.text}`}
      >
        <p className="mb-2 text-4xl">🎉</p>
        <h1 className="mb-4 text-2xl font-bold">Congratulations!</h1>
        <p className="text-lg leading-relaxed">
          You are in <span className="font-bold uppercase">{color} TEAM</span>.
        </p>
        <p className="mt-4 text-base opacity-90">
          Please move to the {color.toUpperCase()} group.
        </p>
      </div>

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>{volunteer.name} · {volunteer.centre} · Code {volunteer.code}</p>
      </div>
    </div>
  );
}
