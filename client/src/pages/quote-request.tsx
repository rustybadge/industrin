import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Clock, Phone, Mail, ArrowLeft, Upload } from "lucide-react";

const quoteFormSchema = z.object({
  name: z.string().min(1, "Namn är obligatoriskt"),
  email: z.string().email("Ange en giltig e-postadress"),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceType: z.string().optional(),
  message: z.string().min(10, "Beskriv vad du behöver hjälp med (minst 10 tecken)"),
  urgency: z.string().default("planerad"),
  preferredContact: z.string().default("email"),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

export default function QuoteRequest() {
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const companySlug = params.slug;
  
  const { data: company, isLoading } = useQuery({
    queryKey: ['/api/companies', companySlug],
    queryFn: () => api.companies.getBySlug(companySlug!),
    enabled: !!companySlug,
  });

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      serviceType: "",
      message: "",
      urgency: "planerad",
      preferredContact: "email",
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: QuoteFormData) => api.quoteRequests.create({
      ...data,
      companyId: company!.id,
    }),
    onSuccess: () => {
      toast({
        title: "Förfrågan skickad!",
        description: `Din förfrågan har skickats till ${company!.name}. De kommer att kontakta dig enligt dina önskemål.`,
      });
      navigate(`/companies/${companySlug}`);
      queryClient.invalidateQueries({ queryKey: ['/api/quote-requests'] });
    },
    onError: (error) => {
      toast({
        title: "Ett fel uppstod",
        description: "Din förfrågan kunde inte skickas. Försök igen senare.",
        variant: "destructive",
      });
      console.error("Error creating quote request:", error);
    },
  });

  const onSubmit = (data: QuoteFormData) => {
    createQuoteMutation.mutate(data);
  };

  if (isLoading || !company) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Back Button */}
          <div className="mb-6">
            <Link href={`/companies/${companySlug}`}>
            <Button 
              variant="ghost" 
              className="text-black hover:text-gray-700 hover:bg-transparent transition-colors flex items-center gap-2 px-3 py-2 group pl-[4px] pr-[4px]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Tillbaka till {company.name}
            </Button>
            </Link>
          </div>

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-bold text-[#1f2937]">
                Skicka förfrågan till {company.name}
              </CardTitle>
              <p className="text-gray-600">Kostnadsfri tjänst, fri support!</p>
            </CardHeader>
          
            <CardContent className="px-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Service Description Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Beskriv vad du behöver hjälp med</h3>
                  

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Beskriv er förfrågan *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tips: En bra och tydlig beskrivning möjliggör fler och bättre svar."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Tidsram</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="akut">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  Akut - Behöver hjälp idag
                                </div>
                              </SelectItem>
                              <SelectItem value="inom_veckan">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  Inom en vecka
                                </div>
                              </SelectItem>
                              <SelectItem value="planerad">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  Planerad - Har tid att vänta
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* File Upload Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Bifoga filer (valfritt)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">
                      Ritningar, dokument, bilder m.m.
                    </p>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setUploadedFiles(prev => [...prev, ...files]);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      Välj filer
                    </label>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Ta bort
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold text-gray-900">Kontaktuppgifter</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Namn *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ditt namn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Företag</FormLabel>
                          <FormControl>
                            <Input placeholder="Företagsnamn (valfritt)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">E-post *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="din@email.se" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Telefon</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="08-123 45 67" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Önskas via</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  E-post
                                </div>
                              </SelectItem>
                              <SelectItem value="phone">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  Telefon
                                </div>
                              </SelectItem>
                              <SelectItem value="both">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <Phone className="h-4 w-4" />
                                  Båda
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex space-x-3 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(`/companies/${companySlug}`)}
                    className="flex-1"
                    disabled={createQuoteMutation.isPending}
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-white"
                    disabled={createQuoteMutation.isPending}
                  >
                    {createQuoteMutation.isPending ? "Skickar..." : "Skicka förfrågan"}
                  </Button>
                </div>
              </form>
            </Form>
            </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}