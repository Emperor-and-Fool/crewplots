import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Clock, User, Trash2, Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { RichTextEditor, MessageDisplay } from '@/components/ui/rich-text-editor';

// Document form validation schema
const documentFormSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be less than 10000 characters'),
  documentType: z.enum(['motivation', 'bio', 'note']).default('motivation'),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

// MongoDB document interface
interface MotivationDocument {
  _id: string;
  userId: number;
  userPublicId: string;
  content: string;
  documentType: 'motivation' | 'bio' | 'note';
  createdAt: string;
  updatedAt: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    htmlLength: number;
  };
}

// Component props
interface MongoDBMessagingSystemProps {
  userId: number;
  title?: string;
  placeholder?: string;
  maxHeight?: string;
  className?: string;
  compactMode?: boolean;
  onDocumentSaved?: (document: MotivationDocument) => void;
}

export default function MongoDBMessagingSystem({
  userId,
  title = "Documents",
  placeholder = "Write your motivation...",
  maxHeight = "400px",
  className = "",
  compactMode = false,
  onDocumentSaved
}: MongoDBMessagingSystemProps) {
  const { toast } = useToast();
  const [editingDocumentId, setEditingDocumentId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      content: '',
      documentType: 'motivation',
    },
  });

  // Fetch documents from MongoDB
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['/api/mongodb/documents', userId],
    queryFn: async (): Promise<MotivationDocument[]> => {
      const response = await fetch(`/api/mongodb/documents/${userId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      return response.json();
    },
  });

  // Create document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentData: DocumentFormData): Promise<MotivationDocument> => {
      const response = await fetch('/api/mongodb/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (newDocument) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/mongodb/documents', userId],
      });
      
      form.reset();
      onDocumentSaved?.(newDocument);
      
      toast({
        title: 'Document saved',
        description: 'Your motivation document has been successfully saved to MongoDB.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to save document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, content }: { documentId: string, content: string }): Promise<MotivationDocument> => {
      const response = await fetch(`/api/mongodb/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to update document: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/mongodb/documents', userId],
      });
      
      setEditingDocumentId(null);
      setEditContent('');
      
      toast({
        title: 'Document updated',
        description: 'Your document has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      const response = await fetch(`/api/mongodb/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/mongodb/documents', userId],
      });
      
      toast({
        title: 'Document deleted',
        description: 'Your document has been successfully deleted.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: DocumentFormData) => {
    createDocumentMutation.mutate(data);
  };

  return (
    <Card className={className}>
      <CardHeader className={compactMode ? 'pb-3' : ''}>
        <div className="flex items-center gap-2 text-base font-medium">
          <MessageCircle className="h-4 w-4" />
          {title}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Documents Display */}
        <ScrollArea className="rounded-md border p-3" style={{ maxHeight }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
              <span className="ml-2">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            editingDocumentId === 'new' ? (
              // Show editor when creating first document
              <div className="space-y-3 p-3">
                <RichTextEditor
                  content={editContent}
                  onChange={setEditContent}
                  placeholder={placeholder}
                  className="min-h-[120px]"
                />
                
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-xs text-muted-foreground">
                    {editContent.length}/10000 characters
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (editContent.trim()) {
                          form.setValue('content', editContent);
                          form.setValue('documentType', 'motivation');
                          form.handleSubmit(onSubmit)();
                          setEditingDocumentId(null);
                          setEditContent('');
                        }
                      }}
                      disabled={createDocumentMutation.isPending || !editContent.trim()}
                    >
                      {createDocumentMutation.isPending ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingDocumentId(null);
                        setEditContent('');
                      }}
                      disabled={createDocumentMutation.isPending}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              // Show button when no documents exist
              <div className="flex flex-col items-center justify-center py-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full max-w-sm"
                  onClick={() => {
                    setEditingDocumentId('new');
                    setEditContent('');
                  }}
                >
                  <Edit2 className="h-5 w-5 mr-2" />
                  write motivation
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document._id}
                  className="flex gap-3 p-3 rounded-lg border transition-colors bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                >
                  <div className="flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">You</span>
                      <Badge variant="secondary" className="text-xs">
                        {document.documentType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(document.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                      
                      {document.updatedAt !== document.createdAt && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Updated
                        </Badge>
                      )}
                    </div>
                    
                    {editingDocumentId === document._id ? (
                      <div className="space-y-2">
                        <RichTextEditor
                          content={editContent}
                          onChange={setEditContent}
                          placeholder={placeholder}
                          className="min-h-[100px]"
                        />
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (editContent.trim()) {
                                updateDocumentMutation.mutate({
                                  documentId: document._id,
                                  content: editContent
                                });
                              }
                            }}
                            disabled={updateDocumentMutation.isPending || !editContent.trim()}
                          >
                            {updateDocumentMutation.isPending ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDocumentId(null);
                              setEditContent('');
                            }}
                            disabled={updateDocumentMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <MessageDisplay content={document.content} />
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingDocumentId(document._id);
                              setEditContent(document.content);
                            }}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this document?')) {
                                deleteDocumentMutation.mutate(document._id);
                              }
                            }}
                            disabled={deleteDocumentMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                          
                          <div className="text-xs text-muted-foreground ml-auto">
                            {document.metadata.wordCount} words
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {error && (
          <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">
            Error loading documents: {error.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}