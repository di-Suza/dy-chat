import { MessageSquareText } from "lucide-react";

export const PrivateHomePage = () => {
  return (
    <main className="private-home">
      <MessageSquareText className="private-home-icon" size={42} strokeWidth={1.8} />
      <h1>Chats</h1>
      <p>Protected workspace is wired. Chat screens will replace this page in the next feature phase.</p>
    </main>
  );
};

