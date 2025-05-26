import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MessageCircle, Paperclip, Phone, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ApplicantDetail() {
  const [, params] = useRoute("/applicant/:id");
  const [, navigate] = useLocation();
  const applicantId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for reviewer actions
  const [selectedAction, setSelectedAction] = useState<'shortlist' | 'maybe' | 'reject' | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [called, setCalled] = useState(false);
  const [appointment, setAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [newMessage, setNewMessage] = useState("");

  // Fetch applicant data
  const { data: applicant, isLoading } = useQuery({
    queryKey: ['/api/applicants', applicantId],
    queryFn: () => fetch(`/api/applicants/${applicantId}`, { credentials: 'include' }).then(res => res.json()),
    enabled: !!applicantId,
  });

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/me'],
    queryFn: () => fetch('/api/me', { credentials: 'include' }).then(res => res.json()),
  });

  // Save message mutation
  const saveMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!message.trim() || !currentUser?.username) return null;
      const writerName = currentUser.username === 'admin' ? 'Admin' : currentUser.username;
      const messageWithName = `${writerName}: ${message.trim()}`;
      
      // Update the applicant's extraMessage field
      return apiRequest(`/api/applicants/${applicantId}`, 'PATCH', { 
        extraMessage: messageWithName 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants', applicantId] });
      setNewMessage(""); // Clear the message input after saving
    },
  });

  // Update applicant mutation
  const updateApplicantMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/applicants/${applicantId}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/applicants'] });
      toast({
        title: "Success",
        description: "Applicant updated successfully",
      });
    },
  });

  // Auto-save message when leaving the page
  const autoSaveMessage = () => {
    if (newMessage.trim()) {
      saveMessageMutation.mutate(newMessage);
    }
  };

  const handleActionSelect = (action: 'shortlist' | 'maybe' | 'reject') => {
    // Auto-save message before performing action
    autoSaveMessage();
    
    setSelectedAction(action);
    
    // If Short-list is selected, immediately update status and go back to list
    if (action === 'shortlist') {
      updateApplicantMutation.mutate({
        status: 'contacted',
        reviewerNotes,
        locationId: selectedLocation ? parseInt(selectedLocation) : null,
      });
      // Navigate back to applicants list
      setTimeout(() => navigate('/applicants'), 500);
    }
    // If reject is selected, immediately update status
    else if (action === 'reject') {
      updateApplicantMutation.mutate({
        status: 'rejected',
        reviewerNotes,
      });
    }
  };

  const handleSaveReview = () => {
    if (!selectedAction) return;

    // Auto-save message before saving review
    autoSaveMessage();

    const updateData: any = {
      reviewerNotes,
    };

    if (selectedAction === 'maybe') {
      updateData.status = 'interviewed';
    }

    updateApplicantMutation.mutate(updateData);
  };

  const goBack = () => {
    // Auto-save message before going back
    autoSaveMessage();
    navigate('/applicants');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading applicant details...</div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Applicant not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applicants
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{applicant.name}</h1>
          <p className="text-gray-600">Applicant Details & Review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Details */}
          <Card>
            <CardHeader>
              <CardTitle>Applicant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Name</Label>
                  <p className="text-gray-900">{applicant.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-gray-900">{applicant.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone</Label>
                  <p className="text-gray-900">{applicant.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <p className="text-gray-900 capitalize">{applicant.status}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Applied Date</Label>
                  <p className="text-gray-900">
                    {applicant.createdAt ? format(new Date(applicant.createdAt), "MMM d, yyyy") : 'Not available'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applicant Message */}
          {applicant.extraMessage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Message from Applicant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{applicant.extraMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Document Section */}
          {applicant.resumeUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">Resume/CV attached</p>
                <Button variant="outline" size="sm">
                  View Document
                </Button>
              </CardContent>
            </Card>
          )}

          <Separator className="my-6" />

          {/* Reviewer Section */}
          <Card>
            <CardHeader>
              <CardTitle>Review & Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant={selectedAction === 'shortlist' ? 'default' : 'outline'}
                  onClick={() => handleActionSelect('shortlist')}
                  className="flex-1"
                >
                  Short-list
                </Button>
                <Button
                  variant={selectedAction === 'maybe' ? 'default' : 'outline'}
                  onClick={() => handleActionSelect('maybe')}
                  className="flex-1"
                >
                  Maybe
                </Button>
                <Button
                  variant={selectedAction === 'reject' ? 'destructive' : 'outline'}
                  onClick={() => handleActionSelect('reject')}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>

              {/* Reviewer Notes */}
              <div>
                <Label htmlFor="reviewer-notes">Reviewer Notes</Label>
                <Textarea
                  id="reviewer-notes"
                  placeholder="Add your notes about this applicant..."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Short-list specific fields */}
              {selectedAction === 'shortlist' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800">Short-list Actions</h4>
                  
                  {/* Called and Appointment checkboxes */}
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="called"
                        checked={called}
                        onCheckedChange={(checked) => setCalled(checked === true)}
                      />
                      <Label htmlFor="called" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Called
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="appointment"
                        checked={appointment}
                        onCheckedChange={(checked) => setAppointment(checked === true)}
                      />
                      <Label htmlFor="appointment" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Appointment
                      </Label>
                    </div>
                  </div>

                  {/* Appointment date/time fields */}
                  {appointment && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="appointment-date">Appointment Date</Label>
                        <Input
                          id="appointment-date"
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="appointment-time">Appointment Time</Label>
                        <Input
                          id="appointment-time"
                          type="time"
                          value={appointmentTime}
                          onChange={(e) => setAppointmentTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Location dropdown */}
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific location</SelectItem>
                        {locations && locations.length > 0 ? (
                          locations.map((location: any) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="all">All locations</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Save Button */}
              {selectedAction && selectedAction !== 'reject' && (
                <Button 
                  onClick={handleSaveReview}
                  disabled={updateApplicantMutation.isPending}
                  className="w-full"
                >
                  {updateApplicantMutation.isPending ? 'Saving...' : 'Save Review'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  applicant.status === 'new' ? 'bg-blue-100 text-blue-800' :
                  applicant.status === 'contacted' ? 'bg-green-100 text-green-800' :
                  applicant.status === 'interviewed' ? 'bg-yellow-100 text-yellow-800' :
                  applicant.status === 'hired' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {applicant.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Has Message</span>
                <span className={`text-xs ${applicant.extraMessage ? 'text-green-600' : 'text-gray-400'}`}>
                  {applicant.extraMessage ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Has Resume</span>
                <span className={`text-xs ${applicant.resumeUrl ? 'text-green-600' : 'text-gray-400'}`}>
                  {applicant.resumeUrl ? 'Yes' : 'No'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}