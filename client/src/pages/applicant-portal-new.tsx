import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ExternalLink, File, Trash } from 'lucide-react';

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ApplicantPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const [message, setMessage] = useState('');
  const [docName, setDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if not authenticated or not an applicant
  const isAuthenticated = !!user;
  const isApplicant = user?.role === 'applicant';

  React.useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isApplicant)) {
      toast({
        title: "Access Denied",
        description: "You must be logged in as an applicant to view this page.",
        variant: "destructive"
      });
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, isApplicant, navigate, toast]);

  // Fetch applicant profile data
  const { 
    data: profile, 
    isLoading: profileLoading, 
    error: profileError 
  } = useQuery({
    queryKey: ['/api/applicant-portal/my-profile'],
    enabled: isAuthenticated && isApplicant,
  });

  // Fetch applicant documents
  const { 
    data: documents, 
    isLoading: docsLoading, 
    error: docsError 
  } = useQuery({
    queryKey: ['/api/applicant-portal/documents'],
    enabled: isAuthenticated && isApplicant,
  });

  // Update message mutation
  const updateMessage = useMutation({
    mutationFn: async (messageText: string) => {
      return await apiRequest('/api/applicant-portal/message', {
        method: 'PUT',
        body: JSON.stringify({ message: messageText })
      });
    },
    onSuccess: () => {
      toast({
        title: "Message Updated",
        description: "Your message has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applicant-portal/my-profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update message. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Upload document mutation
  const uploadDocument = useMutation({
    mutationFn: async (formData: FormData) => {
      // Custom fetch instead of apiRequest for FormData
      const response = await fetch('/api/applicant-portal/documents', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      });
      setDocName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      queryClient.invalidateQueries({ queryKey: ['/api/applicant-portal/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete document mutation
  const deleteDocument = useMutation({
    mutationFn: async (id: number) => {
      // Custom fetch instead of apiRequest
      const response = await fetch(`/api/applicant-portal/documents/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "Your document has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applicant-portal/documents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle message submission
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      updateMessage.mutate(message);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive"
      });
      return;
    }

    const name = docName.trim() || file.name;
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentName', name);
    
    uploadDocument.mutate(formData);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p>Loading your profile information...</p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-4">Applicant Portal</h1>
        <p className="text-red-500">Error loading your profile. Please try again later.</p>
      </div>
    );
  }

  // Get the applicant status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary">New</Badge>;
      case 'contacted':
        return <Badge variant="outline">Contacted</Badge>;
      case 'interviewed':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Interviewed</Badge>;
      case 'hired':
        return <Badge className="bg-green-500 hover:bg-green-600">Hired</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Applicant Portal</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Your Application</CardTitle>
            <CardDescription>
              View and manage your application details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-lg">{profile && profile.name ? profile.name : 'Loading...'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-lg">{profile && profile.email ? profile.email : 'Loading...'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-lg">{profile && profile.phone ? profile.phone : 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Position Applied</p>
                <p className="text-lg">{profile && profile.positionApplied ? profile.positionApplied : 'Loading...'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="mt-1">{profile && profile.status ? getStatusBadge(profile.status) : 'Loading...'}</div>
              </div>
              <div>
                <p className="text-sm font-medium">Application Date</p>
                <p className="text-lg">{profile && profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Loading...'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Card */}
        <Card>
          <CardHeader>
            <CardTitle>Message to Recruiters</CardTitle>
            <CardDescription>
              Add any additional information for your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMessageSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here (maximum 2000 characters)"
                  className="min-h-[150px]"
                  value={message || (profile && profile.extraMessage) || ''}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                />
                <p className="text-xs text-right text-gray-500">
                  {(message || (profile && profile.extraMessage) || '').length}/2000 characters
                </p>
              </div>
              <Button 
                type="submit" 
                disabled={updateMessage.isPending}
              >
                {updateMessage.isPending ? 'Saving...' : 'Save Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Document Upload Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>
            Upload your identification, work permits, and other required documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="docName">Document Name (Optional)</Label>
                <Input
                  id="docName"
                  placeholder="e.g., ID Card, Work Permit"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">Select Document</Label>
                <Input
                  id="document"
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>
            </div>
            <div>
              <Button 
                type="submit" 
                disabled={uploadDocument.isPending}
                className="flex gap-2 items-center"
              >
                <ExternalLink size={16} /> 
                {uploadDocument.isPending ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <h3 className="font-medium mb-2">Uploaded Documents</h3>
            {docsLoading ? (
              <p>Loading documents...</p>
            ) : docsError ? (
              <p className="text-red-500">Error loading documents.</p>
            ) : documents && Array.isArray(documents) && documents.length > 0 ? (
              <Table>
                <TableCaption>Your uploaded documents</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Uploaded Date</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => {
                    return doc ? (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.documentName}</TableCell>
                        <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {doc.verified_at ? (
                            <Badge className="bg-green-500 hover:bg-green-600">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.documentUrl, '_blank')}
                              className="flex gap-1 items-center"
                            >
                              <File size={16} /> View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this document?')) {
                                  deleteDocument.mutate(doc.id);
                                }
                              }}
                              disabled={deleteDocument.isPending}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null;
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500">No documents uploaded yet.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          <p className="text-sm text-gray-500 mb-2">
            <strong>Accepted file formats:</strong> PDF, Word documents (.doc, .docx), and images (.jpg, .jpeg, .png)
          </p>
          <p className="text-sm text-gray-500">
            <strong>Maximum file size:</strong> 10MB per document
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ApplicantPortal;