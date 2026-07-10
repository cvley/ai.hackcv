export const metadata = { title: "反馈" };
import FeedbackForm from "@/components/FeedbackForm";

export default function FeedbackPage() {
  return (
    <div>
      <div className="section-title">
        <span className="bar" />💬 反馈
      </div>
      <div className="prose">
        <p>无论是内容纠错、功能建议还是合作意向，都欢迎告诉我们。</p>
      </div>
      <div style={{ marginTop: 12 }}>
        <FeedbackForm />
      </div>
    </div>
  );
}
