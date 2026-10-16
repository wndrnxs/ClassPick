import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침" };

const SECTIONS = [
  {
    title: "1. 수집하는 개인정보 항목",
    body: "회원가입 시 이름, 이메일, 비밀번호(암호화 저장), 직군, 소속(선택)을 수집합니다. 유료 결제 시 결제 대행사를 통해 주문 정보가 처리되며, 회사는 카드 번호 등 결제 수단 정보를 직접 저장하지 않습니다.",
  },
  {
    title: "2. 개인정보의 이용 목적",
    body: "회원 식별 및 로그인, 연필(포인트) 적립·사용 내역 관리, 고객 문의 응대, 서비스 개선을 위한 통계 분석에 이용합니다.",
  },
  {
    title: "3. 입력 자료의 처리",
    body: "이용자가 입력한 지문·시험지·파일은 자료 생성 목적으로만 처리되며, 생성 자료와 함께 이용자의 자료함에 보관됩니다. 자료 생성을 위해 입력 자료가 AI 모델 제공사(Anthropic)의 API로 전송될 수 있으며, 이는 개인정보 처리 위탁에 해당합니다. 지문에 학생의 성명 등 개인정보를 포함하지 않도록 유의해 주세요.",
  },
  {
    title: "4. 보유 및 파기",
    body: "회원 탈퇴 시 개인정보와 자료함의 자료를 지체 없이 파기합니다. 다만 전자상거래법 등 관계 법령에 따라 보존이 필요한 결제 기록은 법정 기간 동안 보관합니다.",
  },
  {
    title: "5. 이용자의 권리",
    body: "이용자는 언제든지 자신의 개인정보를 조회·수정하거나 삭제(회원 탈퇴)를 요청할 수 있습니다.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-black tracking-tight">개인정보처리방침</h1>
      <p className="mt-2 text-sm text-muted-foreground">초안 — 정식 시행 전 법률 검토를 거쳐 확정됩니다.</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-extrabold">{s.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
