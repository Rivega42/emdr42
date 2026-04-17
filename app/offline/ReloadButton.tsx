'use client';

export function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition-colors"
    >
      Повторить попытку
    </button>
  );
}
