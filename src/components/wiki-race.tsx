"use client";

import { useEffect, useState, useRef } from "react";

interface WikiRaceProps {
  startPage: string;
  targetPage: string;
  onWin: (history: string[]) => void;
}

export default function WikiRace({ startPage, targetPage, onWin }: WikiRaceProps) {
  const [currentPage, setCurrentPage] = useState(startPage);
  const [htmlContent, setHtmlContent] = useState<string>("<p>Chargement...</p>");
  const [history, setHistory] = useState<string[]>([startPage]);
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Appel à l'API publique de Wikipedia
  useEffect(() => {
    async function fetchWikiPage() {
      setIsLoading(true);
      try {
        // L'API officielle qui renvoie le HTML de la page
        const res = await fetch(
          `https://fr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
            currentPage
          )}&format=json&origin=*&disableeditsection=true`
        );
        const data = await res.json();

        if (data?.parse?.text) {
          // On nettoie un peu le HTML (on peut enlever les images ou garder le texte pur)
          setHtmlContent(data.parse.text["*"]);
        } else {
          setHtmlContent("<p>Erreur lors du chargement de la page.</p>");
        }
      } catch (err) {
        console.error(err);
        setHtmlContent("<p>Erreur réseau.</p>");
      }
      setIsLoading(false);
    }

    fetchWikiPage();
  }, [currentPage]);

  // L'intercepteur magique : on empêche le navigateur de suivre le lien !
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // On cherche si on a cliqué sur un lien <a>
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;

    const href = target.getAttribute("href");
    
    // Si c'est un vrai lien Wikipedia interne (ex: /wiki/Pomme)
    if (href && href.startsWith("/wiki/")) {
      e.preventDefault(); // <-- MAGIE : On bloque le comportement par défaut !
      
      const nextPage = decodeURIComponent(href.replace("/wiki/", ""));
      
      // On bloque les liens spéciaux (Aide:, Fichier:, Catégorie:, etc.)
      if (nextPage.includes(":")) return;

      const newHistory = [...history, nextPage];
      setHistory(newHistory);
      setCurrentPage(nextPage);

      // Condition de victoire !
      if (nextPage.toLowerCase() === targetPage.toLowerCase()) {
        onWin(newHistory);
      }
    } else {
      // Si c'est un lien externe ou bizarre, on bloque tout
      e.preventDefault();
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* HEADER DU JEU */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-slate-500">Objectif :</div>
          <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">
            🏁 {targetPage.replace(/_/g, " ")}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Coups : <strong className="text-slate-700">{history.length - 1}</strong></span>
          <span>•</span>
          <span className="truncate">
            Chemin : {history.map(h => h.replace(/_/g, " ")).join(" > ")}
          </span>
        </div>
      </div>

      {/* LECTEUR WIKIPEDIA */}
      <div className="relative flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        )}
        
        {/* C'est ici qu'on injecte le HTML de Wikipedia et qu'on écoute les clics */}
        <div 
          ref={contentRef}
          onClick={handleContentClick}
          className="
            text-sm sm:text-base text-slate-800
            [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium hover:[&_a]:text-blue-800 
            [&_p]:mb-4 [&_p]:leading-relaxed 
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-1
            [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-2 [&_h3]:mt-6
            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_li]:mb-1
            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4
            [&_.mw-editsection]:hidden
            [&_.reference]:hidden
            [&_.navbox]:hidden
            [&_.infobox]:float-right [&_.infobox]:ml-4 [&_.infobox]:mb-4 [&_.infobox]:bg-slate-100 [&_.infobox]:p-2 [&_.infobox]:text-xs [&_.infobox]:rounded-lg
          "
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </div>
  );
}