import { AlertCircle, Home } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-slate-100">
      <div className="w-full max-w-md rounded-[24px] border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-8 w-8 text-orange-400" />
          <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          요청하신 페이지는 현재 이용할 수 없거나 이동된 주소입니다. 홈으로 돌아가 다시 이용해 주세요.
        </p>
        <div className="mt-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
            <Home size={16} />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
