import PsicologosListPage from "@/components/PsicologoListPage";
import Script from "next/script";
import { asTrustedHTML } from "@/utils/trustedTypes";

export default function PsicologosPageWrapper() {
  return (
    <>
      {/* Script de tracking - ProTrack */}
      <Script
        id="protrack-ver-psicologos"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: asTrustedHTML(`
            (function(w,d,s,o,p){w.proTrackDataLayer=w.proTrackDataLayer||[];w.proTrackDataLayer.push({offerId:o,pageType:p});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://kppuuqnpekounoylsdum.supabase.co/storage/v1/object/public/tracking-script/tracking.min.js';f.parentNode.insertBefore(j,f);})(window,document,'script','11','view');
          `),
        }}
      />
      <PsicologosListPage />
    </>
  );
}
