import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/ui/sidebar";
import { MobileNavbar } from "@/components/ui/mobile-navbar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, FileText, BookOpen, Trash2, Edit, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KbArticle, KbCategory, Location } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

export default function KnowledgeBase() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KbArticle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const navigate = (to: string) => setLocation(to);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user has management role
  const isManager = user?.role === "manager";
  const isFloorManager = user?.role === "floor_manager";

  // If user is a floor manager, use their assigned location
  if (isFloorManager && user?.locationId && !selectedLocation) {
    setSelectedLocation(user.locationId);
  }

  // Fetch categories
  const { data: categories, isLoading: loadingCategories } = useQuery<KbCategory[]>({
    queryKey: ['/api/kb-categories'],
  });

  // Fetch locations
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  // Fetch articles based on selected category
  const { data: articles, isLoading: loadingArticles } = useQuery<KbArticle[]>({
    queryKey: ['/api/kb-articles/category', selectedCategory],
    enabled: !!selectedCategory,
  });

  // Filter categories based on selected location
  const filteredCategories = categories?.filter(category => {
    if (selectedLocation && category.locationId !== selectedLocation) {
      return false;
    }
    return true;
  });

  // Filter articles based on search query
  const filteredArticles = articles?.filter(article => {
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !article.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Delete mutation for articles
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/kb-articles/${id}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['/api/kb-articles'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/kb-articles/category', selectedCategory] });
      
      toast({
        title: "Article Deleted",
        description: "The article has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error deleting article:', error);
      toast({
        title: "Error",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle location change
  const handleLocationChange = (locationId: number) => {
    setSelectedLocation(locationId);
    setSelectedCategory(null);
  };

  // Handle delete article
  const handleDeleteArticle = (article: KbArticle) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDeleteArticle = () => {
    if (selectedArticle) {
      deleteArticleMutation.mutate(selectedArticle.id);
    }
  };

  // Placeholder for the article view
  const ArticleView = ({ article }: { article: KbArticle }) => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{article.title}</h2>
          {(isManager || isFloorManager) && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedArticle(article);
                  setShowArticleForm(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteArticle(article)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-gray-100 text-gray-500 text-sm p-2 rounded">
          Last updated: {article.updatedAt 
            ? format(new Date(article.updatedAt), 'MMM d, yyyy h:mm a')
            : format(new Date(article.createdAt), 'MMM d, yyyy h:mm a')}
        </div>
        
        <div className="prose max-w-none">
          {article.content.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
        
        {article.images && article.images.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Images</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {article.images.map((img, idx) => (
                <div key={idx} className="border rounded overflow-hidden">
                  <img src={img} alt={`Image ${idx + 1}`} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Placeholder for article form
  const ArticleForm = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">
          {selectedArticle ? "Edit Article" : "Create New Article"}
        </h2>
        <p className="text-gray-500">
          This is a placeholder for the article form. In the full implementation, 
          this would include form fields for the article title, content, and image uploads.
        </p>
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            className="mr-2"
            onClick={() => {
              setShowArticleForm(false);
              setSelectedArticle(null);
            }}
          >
            Cancel
          </Button>
          <Button>Save Article</Button>
        </div>
      </div>
    );
  };

  // Placeholder for category form
  const CategoryForm = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Create New Category</h2>
        <p className="text-gray-500">
          This is a placeholder for the category form. In the full implementation, 
          this would include form fields for the category name and description.
        </p>
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            className="mr-2"
            onClick={() => setShowCategoryForm(false)}
          >
            Cancel
          </Button>
          <Button>Save Category</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header onLocationChange={handleLocationChange} />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Access and manage operational procedures and recipes
                </p>
              </div>
              {(isManager || isFloorManager) && !showArticleForm && !showCategoryForm && (
                <div className="mt-4 sm:mt-0 flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowCategoryForm(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                  <Button 
                    onClick={() => setShowArticleForm(true)}
                    disabled={!selectedCategory}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    New Article
                  </Button>
                </div>
              )}
            </div>

            {showArticleForm ? (
              <Card>
                <CardContent className="pt-6">
                  <ArticleForm />
                </CardContent>
              </Card>
            ) : showCategoryForm ? (
              <Card>
                <CardContent className="pt-6">
                  <CategoryForm />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Categories sidebar */}
                <div className="md:col-span-1">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {loadingCategories ? (
                        <div className="py-4 text-center">Loading categories...</div>
                      ) : filteredCategories && filteredCategories.length > 0 ? (
                        <ul className="space-y-1">
                          {filteredCategories.map(category => (
                            <li key={category.id}>
                              <Button
                                variant={selectedCategory === category.id ? "default" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => setSelectedCategory(category.id)}
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                {category.name}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="py-4 text-center text-gray-500">
                          {selectedLocation ? (
                            "No categories found for this location"
                          ) : (
                            "Please select a location to view categories"
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Articles area */}
                <div className="md:col-span-3">
                  <Card className="h-full">
                    {selectedCategory ? (
                      <>
                        <CardHeader className="pb-2">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <CardTitle>
                              {categories?.find(c => c.id === selectedCategory)?.name}
                            </CardTitle>
                            <div className="relative mt-2 sm:mt-0">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search articles..."
                                className="pl-8 w-full sm:w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>
                          </div>
                          <CardDescription>
                            {categories?.find(c => c.id === selectedCategory)?.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {loadingArticles ? (
                            <div className="py-6 text-center">Loading articles...</div>
                          ) : selectedArticle ? (
                            <ArticleView article={selectedArticle} />
                          ) : filteredArticles && filteredArticles.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4">
                              {filteredArticles.map(article => (
                                <Card 
                                  key={article.id} 
                                  className="cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => setSelectedArticle(article)}
                                >
                                  <CardContent className="p-4">
                                    <h3 className="font-medium mb-1 truncate">{article.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2">
                                      {article.content.substring(0, 100)}...
                                    </p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="py-10 text-center">
                              <p className="text-gray-500 mb-4">No articles found in this category</p>
                              {(isManager || isFloorManager) && (
                                <Button onClick={() => setShowArticleForm(true)}>
                                  <PlusCircle className="h-4 w-4 mr-2" />
                                  Add First Article
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64">
                        <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-500 mb-2">
                          Select a Category
                        </h3>
                        <p className="text-sm text-gray-400 max-w-md text-center">
                          Choose a category from the sidebar to view articles and recipes
                        </p>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the article "{selectedArticle?.title}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteArticle}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}