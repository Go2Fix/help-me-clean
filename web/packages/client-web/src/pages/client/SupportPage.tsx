import { useState } from 'react';
import { MessageCircle, Mail, Clock, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import Card from '@/components/ui/Card';

const FAQ_ITEMS = [
  {
    q: 'Cum pot reprograma o comanda?',
    a: 'Acceseaza "Comenzile mele" din meniul lateral, selecteaza comanda dorita si apasa butonul "Reprogrameaza". Poti reprograma gratuit cu cel putin 24 de ore inainte.',
  },
  {
    q: 'Cum pot anula un abonament?',
    a: 'Din sectiunea "Abonamente", selecteaza abonamentul si apasa "Anuleaza". Poti pune abonamentul pe pauza daca doresti sa il reactivezi mai tarziu.',
  },
  {
    q: 'Ce fac daca nu sunt multumit de serviciu?',
    a: 'Contacteaza-ne prin WhatsApp sau email in termen de 24 de ore de la finalizarea serviciului. Vom analiza situatia si vom oferi o solutie adecvata.',
  },
  {
    q: 'Cum pot schimba metoda de plata?',
    a: 'Acceseaza "Plati" din meniul lateral pentru a adauga sau sterge carduri. Metoda de plata poate fi schimbata si la momentul rezervarii.',
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const whatsappUrl =
    'https://wa.me/40700000000?text=Buna!%20Am%20nevoie%20de%20ajutor%20cu%20o%20comanda%20Go2Fix.';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ajutor & Suport</h1>
        <p className="text-gray-500 mt-1">Suntem aici sa te ajutam</p>
      </div>

      {/* Contact Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">WhatsApp</h3>
          <p className="text-sm text-gray-500">Raspundem in cateva minute</p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-2.5 text-sm transition-all bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Scrie-ne pe WhatsApp
          </a>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Email</h3>
          <p className="text-sm text-gray-500">Raspundem in maxim 24 de ore</p>
          <a
            href="mailto:support@go2fix.ro"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-5 py-2.5 text-sm transition-all border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Mail className="h-4 w-4" />
            support@go2fix.ro
          </a>
        </Card>
      </div>

      {/* Phone + Hours */}
      <Card className="p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">Telefon: 0700 000 000</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-xs text-gray-500">Luni - Vineri, 09:00 - 18:00</p>
            </div>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Intrebari frecvente</h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <Card key={i} className="overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
              >
                <span className="font-medium text-gray-900 text-sm">{item.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-gray-600 -mt-1">{item.a}</div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
