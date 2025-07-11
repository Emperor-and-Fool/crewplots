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
import { useAuth } from "@/modules/auth";
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
    queryFn: async () => {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      return response.json();
    },
  });

  // Fetch articles based on selected category and location
  const { data: articles, isLoading: loadingArticles } = useQuery<KbArticle[]>({
    queryKey: ['/api/kb-articles', selectedCategory, selectedLocation, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory.toString());
      if (selectedLocation) params.append('locationId', selectedLocation.toString());
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/kb-articles?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      return response.json();
    },
  });

  // Delete article mutation
  const deleteArticleMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/kb-articles/${id}`, undefined);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/kb-articles'] });
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

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; locationId?: number }) => {
      return apiRequest('POST', '/api/kb-categories', data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/kb-categories'] });
      toast({
        title: "Category Created",
        description: "The category has been created successfully",
      });
      setShowCategoryForm(false);
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit article
  const handleEditArticle = (article: KbArticle) => {
    setSelectedArticle(article);
    setShowArticleForm(true);
  };

  // Handle delete article
  const handleDeleteArticle = (article: KbArticle) => {
    setSelectedArticle(article);
    setDeleteDialogOpen(true);
  };

  // Confirm delete article
  const confirmDeleteArticle = () => {
    if (selectedArticle) {
      deleteArticleMutation.mutate(selectedArticle.id);
    }
  };

  // Filter articles based on search query
  const filteredArticles = articles?.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // If not authorized, redirect to dashboard
  if (!isManager && !isFloorManager && user?.role !== "administrator" && user?.role !== "owner") {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for larger screens */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile navigation */}
        <MobileNavbar />
        
        {/* Top header with search and user */}
        <Header />
        
        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {showArticleForm ? (
              // Show article form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowArticleForm(false);
                    setSelectedArticle(null);
                  }}
                  className="mb-4"
                >
                  Back to Knowledge Base
                </Button>
                {/* Article form would go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedArticle ? 'Edit Article' : 'Create New Article'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Article editor form would be implemented here.</p>
                  </CardContent>
                </Card>
              </div>
            ) : showCategoryForm ? (
              // Show category form
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCategoryForm(false)}
                  className="mb-4"
                >
                  Back to Knowledge Base
                </Button>
                {/* Category form would go here */}
                <Card>
                  <CardHeader>
                    <CardTitle>Create New Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">Category creation form would be implemented here.</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Show knowledge base dashboard
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Manage documentation and training materials
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowCategoryForm(true)}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      New Category
                    </Button>
                    <Button onClick={() => {
                      setSelectedArticle(null);
                      setShowArticleForm(true);
                    }}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Article
                    </Button>
                  </div>
                </div>

                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Category filter */}
                  <Select 
                    value={selectedCategory?.toString() || ""} 
                    onValueChange={(value) => setSelectedCategory(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      {categories?.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Location filter */}
                  {!user?.locationId && (
                    <Select 
                      value={selectedLocation?.toString() || ""} 
                      onValueChange={(value) => setSelectedLocation(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Locations</SelectItem>
                        {locations?.map(location => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Tabs defaultValue="articles" className="mb-6">
                  <TabsList>
                    <TabsTrigger value="articles">Articles</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                  </TabsList>

                  <TabsContent value="articles">
                    <Card>
                      <CardHeader>
                        <CardTitle>Articles</CardTitle>
                        <CardDescription>
                          {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingArticles ? (
                          <div className="flex justify-center py-4">
                            <p>Loading articles...</p>
                          </div>
                        ) : filteredArticles.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Author</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredArticles.map((article) => (
                                <TableRow key={article.id}>
                                  <TableCell className="font-medium">
                                    {article.title}
                                  </TableCell>
                                  <TableCell>
                                    {categories?.find(c => c.id === article.categoryId)?.name || 'Uncategorized'}
                                  </TableCell>
                                  <TableCell>
                                    {article.authorId ? `User ${article.authorId}` : 'Unknown'}
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(article.updatedAt), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditArticle(article)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteArticle(article)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No articles found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {searchQuery ? 'Try adjusting your search query.' : 'Get started by creating a new article.'}
                            </p>
                            {!searchQuery && (
                              <div className="mt-6">
                                <Button onClick={() => {
                                  setSelectedArticle(null);
                                  setShowArticleForm(true);
                                }}>
                                  <PlusCircle className="h-4 w-4 mr-2" />
                                  New Article
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="categories">
                    <Card>
                      <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>
                          Organize your knowledge base with categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {loadingCategories ? (
                          <div className="flex justify-center py-4">
                            <p>Loading categories...</p>
                          </div>
                        ) : categories && categories.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map((category) => (
                              <Card key={category.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg">{category.name}</CardTitle>
                                  {category.description && (
                                    <CardDescription>{category.description}</CardDescription>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  <div className="flex justify-between items-center text-sm text-gray-500">
                                    <span>
                                      {articles?.filter(a => a.categoryId === category.id).length || 0} articles
                                    </span>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="sm">
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Create categories to organize your articles.
                            </p>
                            <div className="mt-6">
                              <Button onClick={() => setShowCategoryForm(true)}>
                                <BookOpen className="h-4 w-4 mr-2" />
                                New Category
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
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