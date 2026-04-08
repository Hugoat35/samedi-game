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
  
  // --- JOKERS STATES ---
  const [backjumpsLeft, setBackjumpsLeft] = useState(3);
  const [searchLeft, setSearchLeft] = useState(2);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  // Appel à l'API publique de Wikipedia
  useEffect(() => {
    // On ferme la barre de recherche à chaque changement de page
    setIsSearchOpen(false);
    setSearchQuery("");

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

  // --- FONCTIONS DES JOKERS ---
  const handleBackjump = () => {
    if (backjumpsLeft > 0 && history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Retire la page actuelle
      const previousPage = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentPage(previousPage);
      setBackjumpsLeft((prev) => prev - 1);
    }
  };

  const handleActivateSearch = () => {
    if (searchLeft > 0 && !isSearchOpen) {
      setSearchLeft((prev) => prev - 1);
      setIsSearchOpen(true);
    }
  };

  const executeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    // Utilise la fonction de recherche native du navigateur (saute au mot !)
    const found = (window as any).find(searchQuery, false, false, true, false, true, false);    if (!found) alert("Mot introuvable plus bas dans la page !");
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

        {/* BARRE DES JOKERS */}
        <div className="mt-2 flex gap-2 border-t border-slate-100 pt-2">
          <button
            onClick={handleBackjump}
            disabled={backjumpsLeft === 0 || history.length <= 1 || isLoading}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-100 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-200 disabled:opacity-40"
          >
            <span>⏪</span> Retour ({backjumpsLeft})
          </button>
          
          <button
            onClick={handleActivateSearch}
            disabled={searchLeft === 0 || isSearchOpen || isLoading}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-100 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-40"
          >
            <span>🔍</span> Chercher ({searchLeft})
          </button>
        </div>

        {/* BARRE DE RECHERCHE (Visible que si Joker activé) */}
        {isSearchOpen && (
          <form onSubmit={executeSearch} className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Mot à trouver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
              Sauter au mot
            </button>
          </form>
        )}
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