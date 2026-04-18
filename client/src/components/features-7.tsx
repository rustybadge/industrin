import { BarChart2, Bell, CheckCircle, Settings } from 'lucide-react'

export default function Features7() {
    return (
        <section className="overflow-hidden py-16 md:py-24">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
                <div className="relative z-10 max-w-2xl">
                    <h2 className="custom-size text-4xl font-semibold lg:text-5xl" style={{ fontSize: 'clamp(24px, 3vw, 40px)', letterSpacing: '-0.02em' }}>
                        Byggt för att synas och växa
                    </h2>
                    <p className="mt-6 text-lg text-[#666] leading-relaxed">
                        Din profil på Industrin.net arbetar för dig dygnet runt — oavsett om du precis kommit igång eller vill ta nästa steg.
                    </p>
                </div>
                <div className="relative mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="size-4 text-[#092490]" />
                            <h3 className="custom-size text-sm font-medium" style={{ fontSize: '14px' }}>Verifierad profil</h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Verifierade företag visas med en tydlig markering som ökar kundernas förtroende.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Bell className="size-4 text-[#092490]" />
                            <h3 className="custom-size text-sm font-medium" style={{ fontSize: '14px' }}>Direkta förfrågningar</h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Kunder skickar offertförfrågningar direkt till dig — inga mellanhänder, ingen fördröjning.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="size-4 text-[#092490]" />
                            <h3 className="custom-size text-sm font-medium" style={{ fontSize: '14px' }}>Profilstatistik</h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Se hur många som besökt din profil, vad de sökt efter och var de kommer ifrån.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Settings className="size-4 text-[#092490]" />
                            <h3 className="custom-size text-sm font-medium" style={{ fontSize: '14px' }}>Full kontroll</h3>
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Uppdatera uppgifter, tjänster och kontaktinfo när du vill — direkt från din instrumentpanel.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
