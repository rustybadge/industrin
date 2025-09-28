import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, Info, CheckCircle } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const generalQuoteFormSchema = z.object({
  description: z.string().min(10, 'Beskrivningen måste vara minst 10 tecken'),
  serviceType: z.string().min(1, 'Välj typ av tjänst'),
  urgency: z.string().min(1, 'Välj tidsram'),
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken'),
  email: z.string().email('Ange en giltig e-postadress'),
  phone: z.string().optional(),
  company: z.string().optional(),
  preferredContact: z.string().min(1, 'Välj önskad kontaktmetod'),
  files: z.any().optional(),
});

type GeneralQuoteFormData = z.infer<typeof generalQuoteFormSchema>;

export default function GeneralQuoteRequest() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const form = useForm<GeneralQuoteFormData>({
    resolver: zodResolver(generalQuoteFormSchema),
    defaultValues: {
      description: '',
      serviceType: '',
      urgency: 'planerad',
      name: '',
      email: '',
      phone: '',
      company: '',
      preferredContact: 'email',
    }
  });

  const createGeneralQuoteMutation = useMutation({
    mutationFn: async (data: GeneralQuoteFormData) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'files' && value) {
          formData.append(key, value);
        }
      });
      
      // Add files
      uploadedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const response = await fetch('/api/general-quote-requests', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to submit quote request');
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Förfrågan skickad!",
        description: "Vi har skickat din förfrågan till relevanta företag. Du kommer att få svar inom kort."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fel",
        description: error.message || "Något gick fel. Försök igen senare.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: GeneralQuoteFormData) => {
    createGeneralQuoteMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Tack för din förfrågan!
              </h1>
              <p className="text-gray-600 mb-6">
                Vi har skickat din förfrågan till relevanta företag inom reparation och service. 
                Du kommer att få svar via e-post inom kort.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/companies')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Sök fler företag
                </Button>
                <Button 
                  onClick={() => {
                    setIsSubmitted(false);
                    form.reset();
                    setUploadedFiles([]);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Skicka en till förfrågan
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/companies')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till företagslista
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Begär offert på reparation & service
          </h1>
          <p className="text-lg text-gray-600">
            Kostnadsfri tjänst, fri support!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Beskriv vad du behöver hjälp med</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Service Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Beskriv er förfrågan *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tips: En bra och tydlig beskrivning möjliggör fler och bättre svar. Beskriv vad som behöver repareras, underhållas eller servas..."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Service Type */}
                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Typ av tjänst *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj typ av tjänst" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="reparation">Reparation</SelectItem>
                              <SelectItem value="underhall">Underhåll</SelectItem>
                              <SelectItem value="service">Service</SelectItem>
                              <SelectItem value="montering">Montering</SelectItem>
                              <SelectItem value="konsultation">Konsultation</SelectItem>
                              <SelectItem value="annat">Annat</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Timeframe */}
                    <FormField
                      control={form.control}
                      name="urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Tidsram *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj tidsram" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="akut">Akut - Behövs idag/imorgon</SelectItem>
                              <SelectItem value="planerad">Planerad - Har tid att vänta</SelectItem>
                              <SelectItem value="flexibel">Flexibel - När det passar</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* File Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bifoga filer (valfritt)</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-2">
                          Ritningar, dokument, bilder m.m.
                        </p>
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
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
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 text-sm"
                              >
                                Ta bort
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4 pt-6 border-t">
                      <h3 className="text-lg font-semibold">Kontaktuppgifter</h3>
                      
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
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">E-post *</FormLabel>
                              <FormControl>
                                <Input placeholder="din@email.se" type="email" {...field} />
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
                                <Input placeholder="08-123 45 67" {...field} />
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
                        name="preferredContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Önskas via *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Välj kontaktmetod" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="email">E-post</SelectItem>
                                <SelectItem value="phone">Telefon</SelectItem>
                                <SelectItem value="both">Både e-post och telefon</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex space-x-3 pt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => navigate('/companies')}
                        className="flex-1 h-10 text-sm border border-gray-300 hover:border-gray-400 text-gray-700"
                        disabled={createGeneralQuoteMutation.isPending}
                      >
                        Avbryt
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 h-10 text-sm bg-[#1f2937] hover:bg-[#374151] text-white font-medium"
                        disabled={createGeneralQuoteMutation.isPending}
                      >
                        {createGeneralQuoteMutation.isPending ? "Skickar..." : "Skicka förfrågan"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Hur fungerar det?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Skapa er förfrågan</h4>
                    <p className="text-sm text-gray-600">Beskriv vad ni behöver hjälp med</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Ta emot offerter gratis</h4>
                    <p className="text-sm text-gray-600">Vi skickar ut förfrågan till relevanta företag</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Jämför och välj</h4>
                    <p className="text-sm text-gray-600">Anlita det bästa företaget för er</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Kostnadsfritt</h4>
                      <p className="text-sm text-blue-700">
                        Tjänsten är helt kostnadsfri för er. Företagen betalar en liten avgift när ni anlitar dem.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
