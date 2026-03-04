const mockThreads = [
  {
    id: "msg-1",
    name: "Support Team",
    preview: "Your request has been received and assigned.",
    time: "2m ago",
    unread: 2,
  },
  {
    id: "msg-2",
    name: "Audit Desk",
    preview: "Please review the latest checklist updates.",
    time: "35m ago",
    unread: 0,
  },
  {
    id: "msg-3",
    name: "Certification Team",
    preview: "Certificate verification is now complete.",
    time: "Yesterday",
    unread: 0,
  },
];

export default function DashboardMessagesPage() {
  return (
    <div className="p-3 md:p-6 bg-light-gray min-h-screen">
      <div className="mb-4 md:mb-6">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px]">
          Messages
        </h1>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
          View and manage your role-based conversations.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-secondary">
              Conversations
            </h2>
          </div>
          <div className="p-2">
            {mockThreads.map((thread) => (
              <div
                key={thread.id}
                className="p-3 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-secondary truncate">
                    {thread.name}
                  </p>
                  <span className="text-xs text-gray whitespace-nowrap">
                    {thread.time}
                  </span>
                </div>
                <p className="text-xs text-gray mt-1 truncate">
                  {thread.preview}
                </p>
                {thread.unread > 0 ? (
                  <div className="mt-2">
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium bg-black text-white">
                      {thread.unread}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-8 bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-secondary">
              Conversation
            </h2>
          </div>
          <div className="p-6 flex flex-col items-center justify-center min-h-[320px] text-center">
            <p className="text-base font-medium text-secondary">
              Messages page is ready
            </p>
            <p className="text-sm text-gray mt-2 max-w-md">
              API integration for real-time chat can be connected next.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
