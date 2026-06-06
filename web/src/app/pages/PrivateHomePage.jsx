import { useOutletContext } from "react-router-dom";

import { ChatWorkspace } from "../../features/chat/ui/ChatWorkspace/ChatWorkspace.jsx";

export const PrivateHomePage = () => {
  const context = useOutletContext();

  return <ChatWorkspace onOpenUserSearch={context?.openUserSearch} />;
};
