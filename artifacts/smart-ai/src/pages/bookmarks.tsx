import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useListBookmarks,
  useCreateBookmark,
  useDeleteBookmark,
  getListBookmarksQueryKey,
} from "@workspace/api-client-react";
import type { Bookmark } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark as BookmarkIcon, Plus, Trash2, Tag, Search, BookMarked } from "lucide-react";

const CATEGORIES = ["General", "Learning", "Career", "Research", "Ideas", "Other"];

export default function BookmarksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  const { data: bookmarks, isLoading } = useListBookmarks();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    createBookmark.mutate(
      { data: { title: newTitle, content: newContent, category: newCategory } },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewTitle("");
          setNewContent("");
          setNewCategory("General");
          queryClient.invalidateQueries({ queryKey: getListBookmarksQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteBookmark.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBookmarksQueryKey() }) }
    );
  };

  const filtered = bookmarks?.filter((b: Bookmark) => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory ? b.category === filterCategory : true;
    return matchSearch && matchCat;
  });

  const categories = Array.from(new Set(bookmarks?.map((b: Bookmark) => b.category) ?? []));

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <BookMarked size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bookmarks</h1>
            <p className="text-sm text-muted-foreground">
              Save important insights and responses
            </p>
          </div>
          <Button
            className="ml-auto gap-2"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} />
            Add Bookmark
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={filterCategory === null ? "default" : "outline"}
              className="cursor-pointer py-1 px-3"
              onClick={() => setFilterCategory(null)}
            >
              All
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={filterCategory === cat ? "default" : "outline"}
                className="cursor-pointer py-1 px-3"
                onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <BookmarkIcon size={40} className="text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {search || filterCategory
                ? "No bookmarks match your search"
                : "No bookmarks yet. Save important responses here!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((bookmark: Bookmark) => (
              <Card
                key={bookmark.id}
                className="group hover:border-primary/30 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-1">
                      {bookmark.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(bookmark.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tag size={11} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {bookmark.category}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                    {bookmark.content}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-3">
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bookmark</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  placeholder="Bookmark title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  placeholder="What do you want to save?"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Badge
                      key={cat}
                      variant={newCategory === cat ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setNewCategory(cat)}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newContent.trim() || createBookmark.isPending}
              >
                Save Bookmark
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
