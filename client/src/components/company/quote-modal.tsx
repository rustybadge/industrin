import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { AlertCircle, Clock, Phone, Mail } from "lucide-react";
import type { Company } from "@shared/schema";

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

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
}

export default function QuoteModal({ isOpen, onClose, company }: QuoteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      companyId: company.id,
    }),
    onSuccess: () => {
      toast({
        title: "Förfrågan skickad!",
        description: `Din förfrågan har skickats till ${company.name}. De kommer att kontakta dig enligt dina önskemål.`,
      });
      form.reset();
      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Skicka förfrågan till {company.name}</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">Kostnadsfri tjänst, fri support!</p>
        </DialogHeader>

        <div className="text-sm text-gray-700 mb-4 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="font-medium">Skapa förfrågan idag - Gör det enkelt, snabbt och tryggt!</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Service Description Section */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900">Beskriv tjänsten eller produkten ni letar efter</h3>
              
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Typ av tjänst</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj typ av tjänst" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reparation">Reparation & Service</SelectItem>
                          <SelectItem value="underhall">Underhåll & Förebyggande</SelectItem>
                          <SelectItem value="installation">Installation & Montering</SelectItem>
                          <SelectItem value="konsultation">Konsultation & Rådgivning</SelectItem>
                          <SelectItem value="tillverkning">Tillverkning & Produktion</SelectItem>
                          <SelectItem value="annat">Annat</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

            {/* Contact Information Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-base font-semibold text-gray-900">Avsändare</h3>
              
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
                onClick={onClose}
                className="flex-1"
                disabled={createQuoteMutation.isPending}
              >
                Avbryt
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={createQuoteMutation.isPending}
              >
                {createQuoteMutation.isPending ? "Skickar..." : "Nästa"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
