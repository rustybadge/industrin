import { useLocation } from 'wouter';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 pb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Sidan hittades inte</h1>
          <p className="text-gray-600 text-sm mb-6">
            Länken du följde verkar inte fungera. Gå tillbaka till startsidan så hjälper vi dig vidare.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2 text-sm"
          >
            Gå till startsidan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
