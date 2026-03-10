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
    <div className="p-3 md:p-6 bg-light-gray h-full min-h-0 overflow-hidden flex flex-col">
      <div className="mb-4 md:mb-6 shrink-0">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-secondary mb-1 md:mb-2 leading-[21.6px]">
          Messages
        </h1>
        <p className="text-[13px] md:text-[15px] font-normal text-gray leading-[21.6px]">
          View and manage your role-based conversations.
        </p>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 grid-rows-2 xl:grid-rows-1 gap-4">
        <div className="xl:col-span-4 min-h-0 flex flex-col overflow-hidden bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
            <h2 className="text-sm font-semibold text-secondary">
              Conversations
            </h2>
          </div>
          <div className="p-2 flex-1 min-h-0 overflow-y-auto">
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
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-gray flex-1 truncate">
                    {thread.preview}
                  </p>
                  {thread.unread > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-medium bg-black text-white shrink-0">
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-8 min-h-0 flex flex-col overflow-hidden bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
            <h2 className="text-sm font-semibold text-secondary">
              Conversation
            </h2>
          </div>
          <div className="p-6 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-center">
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
