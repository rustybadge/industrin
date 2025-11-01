import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, CheckCircle } from 'lucide-react';
import { z } from 'zod';

import { SERVICE_CATEGORIES } from '@/data/service-categories';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Company } from '@shared/schema';

const claimFormSchema = z.object({
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken'),
  email: z.string().email('Ange en giltig e-postadress'),
  phone: z.string().optional(),
  message: z.string().optional(),
  serviceCategories: z.array(z.string()).optional(),
  consent: z.boolean().refine(val => val === true, {
    message: 'Du måste godkänna användarvillkoren'
  })
});

type ClaimFormData = z.infer<typeof claimFormSchema>;

export default function ClaimRequest() {
  const [location, navigate] = useLocation();
  const [match, params] = useRoute('/ansokkontroll/:companySlug');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const companySlug = params?.companySlug;

  // Get company data by slug (since our API uses slugs)
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['/api/companies', companySlug],
    queryFn: () => fetch(`/api/companies/${companySlug}`).then(res => {
      if (!res.ok) throw new Error('Company not found');
      return res.json();
    }),
    enabled: !!companySlug
  });

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
      serviceCategories: [],
      consent: false
    }
  });

  const createClaimMutation = useMutation({
    mutationFn: async (data: ClaimFormData) => {
      if (!companySlug || !company) throw new Error('Company information is required');
      
      return fetch(`/api/companies/${company.id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to submit claim');
        return res.json();
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companySlug] });
      toast({
        title: "Ansökan skickad",
        description: "Vi kommer att granska din ansökan och återkomma inom kort."
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

  const onSubmit = (data: ClaimFormData) => {
    createClaimMutation.mutate(data);
  };

  if (!match) {
    navigate('/companies');
    return null;
  }

  if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="text-black hover:text-gray-700 hover:bg-transparent transition-colors flex items-center gap-2 px-3 py-2 group pl-[4px] pr-[4px]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Tillbaka
            </Button>
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-background rounded-lg shadow-sm border border-gray-100 p-8">
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

  if (!company) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Företag hittades inte</h1>
              <p className="text-gray-600 mb-6">Det företag du söker efter finns inte eller har flyttats.</p>
              <Button 
                onClick={() => navigate('/companies')}
                className="bg-[#1f2937] hover:bg-[#374151] text-white px-6 py-2 text-sm"
              >
                Tillbaka till företag
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/companies/${companySlug || ''}`)}
              className="text-black hover:text-gray-700 hover:bg-transparent transition-colors flex items-center gap-2 px-3 py-2 group pl-[4px] pr-[4px]"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Tillbaka till {company?.name}
            </Button>
          </div>
          
          <Card className="border border-gray-200 shadow-sm text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Ansökan skickad!</h1>
              <p className="text-gray-600 mb-6 leading-relaxed max-w-2xl mx-auto">
                Tack för din ansökan om kontroll över <strong>{company?.name}</strong>. 
                Vi kommer att granska din ansökan och återkomma via e-post inom 2-3 arbetsdagar.
              </p>
              <Button 
                onClick={() => navigate(`/companies/${companySlug || ''}`)}
                className="bg-[#1f2937] hover:bg-[#374151] text-white px-6 py-2 text-sm"
              >
                Tillbaka till företagsprofil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Back Button */}
          <div className="mb-6">
            <Button 
            variant="ghost" 
            onClick={() => navigate(`/companies/${companySlug || ''}`)}
            className="text-black hover:text-gray-700 hover:bg-transparent transition-colors flex items-center gap-2 px-3 py-2 group pl-[4px] pr-[4px]"
          >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Tillbaka till {company?.name}
            </Button>
          </div>

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-bold text-[#1f2937]">
                Äger du detta företag?
              </CardTitle>
              <p className="text-gray-600">Ansök om kontroll över {company?.name}</p>
            </CardHeader>
          
            <CardContent className="px-0">
              <div className="mb-6 space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-blue-800 flex items-start leading-relaxed text-sm font-medium">
                    <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                    Genom att ansöka om kontroll kan du uppdatera företagsinformation och svara på förfrågningar.
                  </p>
                </div>
                <div className="p-5 bg-gradient-to-br from-[#FBF7E4] to-[#F9F5E1] border border-[#E8E4D0] rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-base">Vad får du när du ansöker?</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span><strong>Uppdatera din företagsprofil</strong> - Lägg till komplett information, bilder och länkar</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span><strong>Ta emot förfrågningar</strong> - Få kontakt direkt från potentiella kunder som söker dina tjänster</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span><strong>Förbättrad synlighet</strong> - Företag med kompletta profiler får högre ranking i sökningar</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                      <span><strong>Hantera dina tjänster</strong> - Välj och uppdatera vilka serviceområden ni erbjuder</span>
                    </li>
                  </ul>
                </div>
              </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Contact Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Kontaktinformation</h3>
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Fullständigt namn *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ditt för- och efternamn" 
                            {...field} 
                            className="h-10 text-sm border-gray-300 focus:border-[#1f2937] focus:ring-[#1f2937]"
                          />
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
                        <FormLabel className="text-sm font-medium">E-postadress *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="din@foretag.se" 
                            {...field} 
                            className="h-10 text-sm border-gray-300 focus:border-[#1f2937] focus:ring-[#1f2937]"
                          />
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
                        <FormLabel className="text-sm font-medium">Telefonnummer</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="070-123 45 67" 
                            {...field} 
                            className="h-10 text-sm border-gray-300 focus:border-[#1f2937] focus:ring-[#1f2937]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Service Categories Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Vilka tjänster erbjuder ni?</h3>
                  <p className="text-sm text-gray-600">
                    Välj alla tjänster som ni erbjuder. Detta hjälper kunder att hitta er.
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="serviceCategories"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-4">
                            {Object.entries(SERVICE_CATEGORIES).map(([key, category]) => (
                              <div key={key} className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3 text-blue-600">{category.name}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {category.subcategories.map(subcategory => (
                                    <label key={subcategory} className="flex items-center space-x-2 cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        value={subcategory}
                                        checked={field.value?.includes(subcategory) || false}
                                        onChange={(e) => {
                                          const currentValues = field.value || [];
                                          if (e.target.checked) {
                                            field.onChange([...currentValues, subcategory]);
                                          } else {
                                            field.onChange(currentValues.filter(v => v !== subcategory));
                                          }
                                        }}
                                        className="rounded border-gray-300 text-[#1f2937] focus:ring-[#1f2937]"
                                      />
                                      <span className="text-sm">{subcategory}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Beskriv din relation till företaget</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="T.ex. Ägare, VD, Ansvarig för marknadsföring..."
                          className="min-h-[80px] text-sm border-gray-300 focus:border-[#1f2937] focus:ring-[#1f2937] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium text-gray-900 leading-relaxed cursor-pointer">
                          Jag bekräftar att jag är behörig att representera detta företag och godkänner{" "}
                          <a href="#" className="text-[#1f2937] hover:underline font-medium">
                            användarvillkoren
                          </a>
                          .
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(`/companies/${companySlug || ''}`)}
                    className="flex-1 h-10 text-sm border border-gray-300 hover:border-gray-400 text-gray-700"
                    disabled={createClaimMutation.isPending}
                  >
                    Avbryt
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-10 text-sm bg-[#1f2937] hover:bg-[#374151] text-white font-medium"
                    disabled={createClaimMutation.isPending}
                  >
                    {createClaimMutation.isPending ? "Skickar..." : "Skicka ansökan"}
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