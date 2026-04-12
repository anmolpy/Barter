import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Wallet, LogIn, ChevronRight, PieChart, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'motion/react';
import barterLogo from '../../icons/barter_logo.png';

export default function LandingPage() {
  const { signIn } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={barterLogo} alt="Barter logo" className="w-10 h-10 object-contain" />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Barter</span>
        </div>
        <button 
          onClick={signIn}
          className="px-5 py-2.5 text-slate-600 font-medium hover:text-brand-600 transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Secure & Real-time
          </div>
          <h1 className="text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-[1.1]">
            Split bills, <br />
            <span className="text-brand-600">not friendships.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed">
            The simplest way to track shared expenses with friends, family, and housemates. View balances and settle up in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={signIn}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative px-8 py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all flex items-center justify-center overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                Get Started for Free
                <ChevronRight className={cn(
                  "ml-2 w-5 h-5 transition-transform duration-300",
                  isHovered ? "translate-x-1" : ""
                )} />
              </span>
            </button>
            <div className="flex items-center px-6 py-4 text-slate-500 font-medium">
              <Users className="w-5 h-5 mr-2" />
              Join 10,000+ users
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-30 animate-pulse delay-700"></div>
          
          {/* Mock UI Card */}
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <PieChart className="text-brand-500 w-6 h-6" />
            </div>
            
            <div className="space-y-6">
              {[
                { name: 'Dinner at Mario\'s', group: 'Weekend Trip', amount: '$42.50', color: 'bg-emerald-100 text-emerald-700' },
                { name: 'Electricity Bill', group: 'Home', amount: '$115.00', color: 'bg-blue-100 text-blue-700' },
                { name: 'Movie Tickets', group: 'Friends', amount: '$15.00', color: 'bg-purple-100 text-purple-700' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold", item.color)}>
                      {item.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.group}</p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-900">{item.amount}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500">Total Balance</p>
                <p className="text-2xl font-bold text-brand-600">+$245.80</p>
              </div>
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features */}
      <section className="bg-white py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Everything you need to manage shared finances</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Simple, powerful features designed to take the stress out of splitting costs.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: 'Group Spaces', desc: 'Create separate groups for trips, housemates, or events.', icon: Users },
              { title: 'Smart Splitting', desc: 'Split equally, by percentage, or exact amounts with ease.', icon: PieChart },
              { title: 'Instant Balances', desc: 'See exactly who owes what at a single glance.', icon: Wallet }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-slate-50 hover:shadow-xl hover:shadow-slate-100 transition-all group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper for class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
