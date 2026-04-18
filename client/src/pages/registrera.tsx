import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FormData {
  company_name: string;
  org_number: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  description: string;
}

interface FormErrors {
  company_name?: string;
  org_number?: string;
  contact_name?: string;
  email?: string;
}

const initialForm: FormData = {
  company_name: "",
  org_number: "",
  contact_name: "",
  email: "",
  phone: "",
  city: "",
  description: "",
};

export default function Registrera() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.company_name.trim()) newErrors.company_name = "Företagsnamn är obligatoriskt.";
    if (!form.org_number.trim()) newErrors.org_number = "Organisationsnummer är obligatoriskt.";
    if (!form.contact_name.trim()) newErrors.contact_name = "Kontaktperson är obligatoriskt.";
    if (!form.email.trim()) newErrors.email = "E-postadress är obligatorisk.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Server error");
      setSubmitted(true);
    } catch {
      setServerError(
        "Något gick fel. Försök igen eller kontakta oss på info@industrin.net"
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-8">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: "#D1FAE5" }}
                >
                  <svg
                    className="w-6 h-6"
                    style={{ color: "#1D9E75" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Ansökan mottagen</h1>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Tack! Vi har tagit emot din ansökan och återkommer inom 2 arbetsdagar.
                </p>
                <Button
                  onClick={() => navigate("/")}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2 text-sm"
                >
                  Till startsidan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const inputBase =
    "w-full border border-gray-300 rounded px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition";
  const inputFocus = "focus:ring-[#1D9E75]";
  const inputError = "border-red-400 focus:ring-red-400";
  const labelBase = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Back Button */}
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

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <h1 className="font-bold mb-3 tracking-tight text-[42px] text-[#171717]">
                Registrera ditt företag
              </h1>
              <p className="text-gray-600">
                Fyll i uppgifterna nedan så granskar vi din ansökan inom 2 arbetsdagar.
              </p>
            </CardHeader>

            <CardContent className="px-0">
              <form onSubmit={handleSubmit} noValidate className="space-y-6">

                {/* Företagsinformation */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-5 text-[#171717]" style={{ letterSpacing: '-0.01em' }}>Företagsinformation</h3>

                  {/* Företagsnamn */}
                  <div>
                    <label htmlFor="company_name" className={labelBase}>
                      Företagsnamn <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="company_name"
                      name="company_name"
                      type="text"
                      value={form.company_name}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus} ${errors.company_name ? inputError : ""}`}
                    />
                    {errors.company_name && (
                      <p className="mt-1 text-xs text-red-500">{errors.company_name}</p>
                    )}
                  </div>

                  {/* Organisationsnummer */}
                  <div>
                    <label htmlFor="org_number" className={labelBase}>
                      Organisationsnummer <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="org_number"
                      name="org_number"
                      type="text"
                      placeholder="556XXX-XXXX"
                      value={form.org_number}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus} ${errors.org_number ? inputError : ""}`}
                    />
                    {errors.org_number && (
                      <p className="mt-1 text-xs text-red-500">{errors.org_number}</p>
                    )}
                  </div>

                  {/* Stad */}
                  <div>
                    <label htmlFor="city" className={labelBase}>
                      Stad
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={form.city}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus}`}
                    />
                  </div>

                  {/* Beskrivning */}
                  <div>
                    <label htmlFor="description" className={labelBase}>
                      Kort beskrivning av verksamheten
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={form.description}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus} resize-none`}
                    />
                  </div>
                </div>

                {/* Kontaktuppgifter */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold mb-5 text-[#171717]" style={{ letterSpacing: '-0.01em' }}>Kontaktuppgifter</h3>

                  {/* Kontaktperson */}
                  <div>
                    <label htmlFor="contact_name" className={labelBase}>
                      Kontaktperson <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="contact_name"
                      name="contact_name"
                      type="text"
                      value={form.contact_name}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus} ${errors.contact_name ? inputError : ""}`}
                    />
                    {errors.contact_name && (
                      <p className="mt-1 text-xs text-red-500">{errors.contact_name}</p>
                    )}
                  </div>

                  {/* E-postadress */}
                  <div>
                    <label htmlFor="email" className={labelBase}>
                      E-postadress <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus} ${errors.email ? inputError : ""}`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* Telefonnummer */}
                  <div>
                    <label htmlFor="phone" className={labelBase}>
                      Telefonnummer
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className={`${inputBase} ${inputFocus}`}
                    />
                  </div>
                </div>

                {serverError && (
                  <p className="text-sm text-red-500">{serverError}</p>
                )}

                <div className="flex space-x-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    className="flex-1 h-10 text-sm border border-gray-300 hover:border-gray-400 text-gray-700"
                    disabled={loading}
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-10 text-sm bg-primary hover:bg-primary-dark text-white font-medium"
                  >
                    {loading ? "Skickar..." : "Skicka ansökan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
