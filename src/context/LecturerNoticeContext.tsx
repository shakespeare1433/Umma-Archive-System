import React, { createContext, useContext } from 'react';

interface LecturerNoticeContextValue {
  focusRequestId: string | null;
  openHistory: (requestId: string) => void;
}

const LecturerNoticeContext = createContext<LecturerNoticeContextValue>({
  focusRequestId: null,
  openHistory: () => {},
});

export function LecturerNoticeProvider({
  focusRequestId,
  openHistory,
  children,
}: LecturerNoticeContextValue & { children: React.ReactNode }) {
  return (
    <LecturerNoticeContext.Provider value={{ focusRequestId, openHistory }}>
      {children}
    </LecturerNoticeContext.Provider>
  );
}

export function useLecturerNotice() {
  return useContext(LecturerNoticeContext);
}
