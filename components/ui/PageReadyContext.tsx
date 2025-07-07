"use client";

import { createContext, useContext, useState } from "react";

const PageReadyContext = createContext<{ pageReady: boolean; setPageReady: (ready: boolean) => void }>({
	pageReady: false,
	setPageReady: () => {},
});

export const PageReadyProvider = ({ children }: { children: React.ReactNode }) => {
	const [pageReady, setPageReady] = useState(false);
	return <PageReadyContext.Provider value={{ pageReady, setPageReady }}>{children}</PageReadyContext.Provider>;
};

export const usePageReady = () => useContext(PageReadyContext);
