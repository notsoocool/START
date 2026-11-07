"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Book,
    Bookmark,
    FileText,
    ScrollText,
    Lock,
    Loader2,
    AlertCircle,
    User,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCurrentUser, useBooks } from "@/lib/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

// Define the item types based on API response structure
type Item = {
    id: string;
    title: string;
    type: "book" | "subpart" | "sub-subpart" | "chapter";
    children?: Item[];
    status?: {
        locked: boolean;
        userPublished?: boolean;
        groupPublished?: boolean;
        owners?: string[];
        owner?: string | null;
    };
    /** For sub-subpart: actual part2 value for URL (null -> "null") */
    part2Value?: string | null;
};

// Mapping the icons and colors to types
const iconMap = {
    book: Book,
    subpart: Bookmark,
    "sub-subpart": FileText,
    chapter: ScrollText,
};

const colorMap = {
    book: "bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-950 hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-800 dark:hover:to-purple-900 shadow-sm",
    subpart:
        "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-950 hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800 dark:hover:to-blue-900 shadow-sm",
    "sub-subpart":
        "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-950 hover:from-green-200 hover:to-green-300 dark:hover:from-green-800 dark:hover:to-green-900 shadow-sm",
    chapter:
        "bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-950 hover:from-yellow-200 hover:to-yellow-300 dark:hover:from-yellow-800 dark:hover:to-yellow-900 shadow-sm",
};

function PublishStatusDots({
    status,
    showAdminExtras,
    onContributorsClick,
}: {
    status?: Item["status"];
    showAdminExtras?: boolean;
    onContributorsClick?: () => void;
}) {
    if (!status) return null;
    const owners = status.owners?.length
        ? status.owners
        : status.owner
          ? [status.owner]
          : [];
    const showGreen = Boolean(status.userPublished);
    const showBlue = Boolean(status.groupPublished);
    const showLock = showAdminExtras && Boolean(status.locked);
    const showOwner =
        showAdminExtras &&
        owners.length > 0 &&
        !status.userPublished &&
        !status.groupPublished;

    return (
        <div className="flex items-center gap-2">
            {showLock && (
                <div className="relative group z-50">
                    <Lock className="h-4 w-4 text-red-500" />
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-red-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                        Locked
                    </span>
                </div>
            )}
            {showGreen && (
                <div className="relative group z-50">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-green-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                        Public
                    </span>
                </div>
            )}
            {showBlue && (
                <div className="relative group z-50">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-blue-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                        Group shared
                    </span>
                </div>
            )}
            {showOwner && (
                <div className="relative group z-50">
                    <User
                        className="h-4 w-4 text-orange-500 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            onContributorsClick?.();
                        }}
                    />
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-orange-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                        {owners.length === 1
                            ? "Private (1 contributor)"
                            : `Private (${owners.length} contributors)`}
                    </span>
                </div>
            )}
        </div>
    );
}

type ContributorRow = {
    userID: string;
    name: string;
    perms: string;
    shlokaCount: number;
};

function ContributorsDialog({
    book,
    open,
    onOpenChange,
}: {
    book: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<ContributorRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !book) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/books/contributors?book=${encodeURIComponent(book)}`
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to load");
                if (!cancelled) setRows(data.contributors || []);
            } catch (e) {
                if (!cancelled) setError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, book]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Private contributors</DialogTitle>
                    <DialogDescription>
                        Everyone who has added shlokas to {book || "this book"}
                    </DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No owners recorded on this book.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Shlokas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.userID}>
                                    <TableCell>
                                        <div className="font-medium">{r.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {r.userID}
                                        </div>
                                    </TableCell>
                                    <TableCell>{r.perms}</TableCell>
                                    <TableCell className="text-right">
                                        {r.shlokaCount}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Component for book card in grid view
const BookCard = ({
    item,
    onExpand,
    currentUser,
}: {
    item: Item;
    onExpand: () => void;
    currentUser: any;
}) => {
    const [contribOpen, setContribOpen] = useState(false);
    const Icon = iconMap[item.type];

    return (
        <>
            <motion.div
                layoutId={`book-grid-${item.id}`}
                className="w-full flex flex-col bg-primary-foreground sm:rounded-3xl overflow-visible transition-colors duration-500 cursor-pointer shadow-md hover:shadow-lg"
                onClick={onExpand}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="p-6 overflow-visible">
                    <div className="flex items-center gap-3 overflow-visible">
                        <Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />
                        <h3 className="font-medium text-base text-neutral-700 dark:text-neutral-200">
                            {item.title}
                        </h3>
                        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                            <PublishStatusDots
                                status={item.status}
                                showAdminExtras={
                                    currentUser?.perms === "Admin" ||
                                    currentUser?.perms === "Root"
                                }
                                onContributorsClick={() => setContribOpen(true)}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
            <ContributorsDialog
                book={item.title}
                open={contribOpen}
                onOpenChange={setContribOpen}
            />
        </>
    );
};

// Component to display each tree node and handle the expand/collapse state
const TreeNode = ({
    item,
    level = 0,
    book,
    part1,
    part2,
    isHorizontal = false,
}: {
    item: Item;
    level?: number;
    book?: string;
    part1?: string;
    part2?: string;
    isHorizontal?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [contribOpen, setContribOpen] = useState(false);
    const router = useRouter();
    const { data: currentUser } = useCurrentUser(); // Use the cached user data
    const bookName = book || (item.type === "book" ? item.title : undefined);

    const handleChapterClick = () => {
        if (item.type === "chapter") {
            const chapterNumber = item.title.replace("Chapter ", "").trim();
            router.push(
                `/books/${book || "null"}/${part1 || "null"}/${part2 || "null"
                }/${chapterNumber}`
            );
        }
    };

    const hasChildren = item.children && item.children.length > 0;
    const Icon = iconMap[item.type];

    // Don't render if there are no children and it's not a chapter
    if (!hasChildren && item.type !== "chapter") return null;

    return (
        <motion.div
            layoutId={`card-${item.id}`}
            className={`${isHorizontal ? "flex-shrink-0" : "w-full"} mb-2  flex flex-col bg-secondary sm:rounded-3xl overflow-visible transition-colors duration-500`}
        >
            <div className="overflow-visible">
                <div className="flex justify-between items-center p-4 overflow-visible">
                    <div className="flex items-center gap-3 flex-1 overflow-visible">
                        <Icon className="h-5 w-5 text-neutral-700 dark:text-neutral-200 flex-shrink-0" />
                        <div className="flex-1 overflow-visible">
                            <motion.h3
                                layoutId={`title-${item.id}`}
                                className="font-medium text-neutral-700 dark:text-neutral-200"
                            >
                                {item.title}
                            </motion.h3>
                            {item.type === "book" && (
                                <div className="mt-2">
                                    <PublishStatusDots
                                        status={item.status}
                                        showAdminExtras={
                                            currentUser?.perms === "Admin" ||
                                            currentUser?.perms === "Root"
                                        }
                                        onContributorsClick={() =>
                                            setContribOpen(true)
                                        }
                                    />
                                </div>
                            )}
                            {item.type === "chapter" && item.status && (
                                <div className="mt-2">
                                    <PublishStatusDots
                                        status={item.status}
                                        showAdminExtras={
                                            currentUser?.perms === "Admin" ||
                                            currentUser?.perms === "Root"
                                        }
                                        onContributorsClick={() =>
                                            setContribOpen(true)
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {item.type === "chapter" ? (
                        <HoverBorderGradient

                            onClick={handleChapterClick}
                        >
                            Open
                        </HoverBorderGradient>
                    ) : hasChildren ? (
                        <HoverBorderGradient
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            {isOpen ? "Collapse" : "Expand"}
                        </HoverBorderGradient>
                    ) : null}
                </div>
                <ContributorsDialog
                    book={bookName || null}
                    open={contribOpen}
                    onOpenChange={setContribOpen}
                />
                <AnimatePresence>
                    {isOpen && hasChildren && (
                        <motion.div
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pt-4 relative px-4"
                        >
                            <motion.div
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-neutral-600 text-xs md:text-sm lg:text-base pb-4 flex flex-col items-start gap-2 overflow-auto dark:text-neutral-400"
                            >
                                {item.children?.map((child) => {
                                    if (child && child.id) {
                                        return (
                                            <TreeNode
                                                key={child.id}
                                                item={child}
                                                level={level + 1}
                                                book={
                                                    book ||
                                                    (item.type === "book"
                                                        ? item.title
                                                        : undefined)
                                                }
                                                part1={
                                                    part1 ||
                                                    (item.type === "subpart"
                                                        ? item.title
                                                        : undefined)
                                                }
                                                part2={
                                                    part2 ??
                                                    (item.type === "sub-subpart"
                                                        ? (item.part2Value ?? item.title)
                                                        : undefined)
                                                }
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// Expanded book view component (for left panel)
const ExpandedBookView = ({
    item,
    onClose,
    currentUser,
}: {
    item: Item;
    onClose: () => void;
    currentUser: any;
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [contribOpen, setContribOpen] = useState(false);

    const Icon = iconMap[item.type];
    const hasChildren = item.children && item.children.length > 0;

    return (
        <motion.div
            className="w-full h-full flex flex-col bg-primary-foreground sm:rounded-3xl overflow-visible"
        >
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 overflow-visible">
                <div className="flex items-center justify-between overflow-visible">
                    <div className="flex items-center gap-3 flex-1 overflow-visible">
                        <Icon className="h-6 w-6 text-neutral-700 dark:text-neutral-200" />
                        <h3 className="font-medium text-lg text-neutral-700 dark:text-neutral-200">
                            {item.title}
                        </h3>
                        <div className="ml-2">
                            <PublishStatusDots
                                status={item.status}
                                showAdminExtras={
                                    currentUser?.perms === "Admin" ||
                                    currentUser?.perms === "Root"
                                }
                                onContributorsClick={() => setContribOpen(true)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-primary/10  rounded-full transition-colors flex-shrink-0"
                    >
                        <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence>
                    {isOpen && hasChildren && (
                        <motion.div
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-2"
                        >
                            {item.children?.map((child) => {
                                if (child && child.id) {
                                    return (
                                        <TreeNode
                                            key={child.id}
                                            item={child}
                                            level={1}
                                            book={item.title}
                                            isHorizontal={true}
                                        />
                                    );
                                }
                                return null;
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <ContributorsDialog
                book={item.title}
                open={contribOpen}
                onOpenChange={setContribOpen}
            />
        </motion.div>
    );
};

// Separate component for the books content
function BooksContent() {
    const { data: currentUser, isLoading: userLoading } = useCurrentUser();
    const {
        data: booksData,
        isLoading: booksLoading,
        error: booksError,
    } = useBooks();
    const queryClient = useQueryClient();
    const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

    useEffect(() => {
        // Clear React Query cache when component unmounts (e.g., on sign out)
        return () => {
            queryClient.clear();
        };
    }, [queryClient]);

    const isLoading = userLoading || booksLoading;
    const error = booksError?.message;

    // Transform the books data
    console.log("Books data from API:", booksData);
    const books = booksData
        ? booksData.map(
            (book: {
                book: string;
                part1?: any[];
                chapters?: string[];
                status?: any;
            }) => {
                console.log(
                    "Processing book:",
                    book.book,
                    "with status:",
                    book.status
                );
                return {
                    id: book.book,
                    title: book.book,
                    type: "book" as const,
                    status: book.status,
                    children:
                        book.part1 && book.part1.length > 0
                            ? book.part1
                                .map((part1: any) => {
                                    if (part1.part === null) {
                                        return part1.part2[0].chapters.map(
                                            (chapter: string | { chaptno: string; status?: Item["status"] }) => {
                                                const chaptno =
                                                    typeof chapter === "string"
                                                        ? chapter
                                                        : chapter.chaptno;
                                                const status =
                                                    typeof chapter === "string"
                                                        ? undefined
                                                        : chapter.status;
                                                return {
                                                    id: `${book.book}-chapter-${chaptno}`,
                                                    title: `Chapter ${chaptno}`,
                                                    type: "chapter" as const,
                                                    status,
                                                };
                                            }
                                        );
                                    }
                                    // part1.part2 can have BOTH { part: null, chapters } AND { part: "X", chapters }
                                    // We must iterate ALL part2 entries, not just check part2[0]
                                    const hasOnlyNullPart2 =
                                        !part1.part2?.length ||
                                        (part1.part2.length === 1 &&
                                            (part1.part2[0].part === null ||
                                                part1.part2[0].part === undefined));
                                    if (hasOnlyNullPart2) {
                                        return {
                                            id: `${book.book}-${part1.part}`,
                                            title: part1.part,
                                            type: "subpart" as const,
                                            children:
                                                part1.part2?.[0]?.chapters?.map(
                                                    (chapter: string | { chaptno: string; status?: Item["status"] }) => {
                                                        const chaptno =
                                                            typeof chapter === "string"
                                                                ? chapter
                                                                : chapter.chaptno;
                                                        const status =
                                                            typeof chapter === "string"
                                                                ? undefined
                                                                : chapter.status;
                                                        return {
                                                            id: `${book.book}-${part1.part}-chapter-${chaptno}`,
                                                            title: `Chapter ${chaptno}`,
                                                            type: "chapter" as const,
                                                            status,
                                                        };
                                                    }
                                                ) || [],
                                        };
                                    }
                                    // Multiple part2 entries (e.g. null + "भेषज चतुष्क") - show all
                                    return {
                                        id: `${book.book}-${part1.part}`,
                                        title: part1.part,
                                        type: "subpart" as const,
                                        children: part1.part2
                                            .map((part2: any) => {
                                                const part2Label =
                                                    part2.part === null ||
                                                    part2.part === undefined
                                                        ? "None"
                                                        : part2.part;
                                                const part2Id =
                                                    part2.part === null ||
                                                    part2.part === undefined
                                                        ? `${book.book}-${part1.part}-null`
                                                        : `${book.book}-${part1.part}-${part2.part}`;
                                                const part2Value =
                                                    part2.part === null ||
                                                    part2.part === undefined
                                                        ? "null"
                                                        : part2.part;
                                                return {
                                                    id: part2Id,
                                                    title: part2Label,
                                                    type: "sub-subpart" as const,
                                                    part2Value,
                                                    children: (part2.chapters || []).map(
                                                        (chapter: string | { chaptno: string; status?: Item["status"] }) => {
                                                            const chaptno =
                                                                typeof chapter === "string"
                                                                    ? chapter
                                                                    : chapter.chaptno;
                                                            const status =
                                                                typeof chapter === "string"
                                                                    ? undefined
                                                                    : chapter.status;
                                                            return {
                                                                id: `${part2Id}-chapter-${chaptno}`,
                                                                title: `Chapter ${chaptno}`,
                                                                type: "chapter" as const,
                                                                status,
                                                            };
                                                        }
                                                    ),
                                                };
                                            })
                                            .flat(),
                                    };
                                })
                                .flat()
                            : book.chapters
                                ? book.chapters.map(
                                      (chapter: string | { chaptno: string; status?: Item["status"] }) => {
                                          const chaptno =
                                              typeof chapter === "string"
                                                  ? chapter
                                                  : chapter.chaptno;
                                          const status =
                                              typeof chapter === "string"
                                                  ? undefined
                                                  : chapter.status;
                                          return {
                                              id: `${book.book}-chapter-${chaptno}`,
                                              title: `Chapter ${chaptno}`,
                                              type: "chapter" as const,
                                              status,
                                          };
                                      }
                                  )
                                : [],
                };
            }
        )
        : [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-red-600 dark:text-red-400">{error}</div>
            </div>
        );
    }

    if (books.length === 0) {
        return (
            <div className="text-center text-gray-600 dark:text-gray-300 py-12">
                No books available for your access level.
            </div>
        );
    }

    const expandedBook = expandedBookId
        ? books.find((book: Item) => book.id === expandedBookId)
        : null;
    const otherBooks = expandedBookId
        ? books.filter((book: Item) => book.id !== expandedBookId)
        : books;

    return (
        <AnimatePresence mode="wait">
            {expandedBook ? (
                <motion.div
                    key={`expanded-${expandedBookId}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full"
                >
                    {/* Left section - Expanded book */}
                    <motion.div
                        key={`expanded-view-${expandedBook.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]"
                    >
                        <ExpandedBookView
                            item={expandedBook}
                            onClose={() => setExpandedBookId(null)}
                            currentUser={currentUser}
                        />
                    </motion.div>

                    {/* Right section - Grid of other books */}
                    <motion.div
                        key={`grid-${expandedBookId}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max"
                    >
                        {otherBooks.map((book: Item) => (
                            <BookCard
                                key={book.id}
                                item={book}
                                onExpand={() => setExpandedBookId(book.id)}
                                currentUser={currentUser}
                            />
                        ))}
                    </motion.div>
                </motion.div>
            ) : (
                <motion.div
                    key="books-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {books.map((book: Item) => (
                        <BookCard
                            key={book.id}
                            item={book}
                            onExpand={() => setExpandedBookId(book.id)}
                            currentUser={currentUser}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Main component
export default function SacredTexts() {
    const { isSignedIn, isLoaded: authLoaded } = useAuth();

    // Wait for Clerk to load
    if (!authLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="w-full max-w-7xl mx-auto space-y-6">
                <h2 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 mb-3">
                    Sanskrit Texts
                </h2>
                <p className={`text-center text-sm text-muted-foreground max-w-xl mx-auto ${isSignedIn ? "mb-4" : "mb-8"}`}>
                    <a
                        href="/E-reader.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                    >
                        <FileText className="h-4 w-4 shrink-0" />
                        What is an e-reader? (PDF)
                    </a>
                </p>
                {isSignedIn && (
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground mb-8">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Public
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Group shared
                        </span>
                    </div>
                )}
                <div className="w-full">
                    {!isSignedIn ? (
                        <div className="w-full max-w-2xl mx-auto backdrop-blur-sm bg-white/30 dark:bg-gray-900/40 p-6 rounded-xl shadow-xl">
                            <p className="text-center text-gray-600 dark:text-gray-300">
                                Please sign in to view the books.
                            </p>
                        </div>
                    ) : (
                        <BooksContent />
                    )}
                </div>
            </div>
        </div>
    );
}
