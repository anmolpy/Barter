import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Plus, 
  Users, 
  ChevronRight, 
  LogOut, 
  PlusCircle, 
  History, 
  TrendingUp, 
  TrendingDown,
  X,
  UserPlus,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import barterLogo from '../../icons/barter_logo.png';

interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[];
  createdBy: string;
  createdAt: any;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: any;
  splitType: 'equal' | 'percentage' | 'exact';
  splits: { userId: string; amount: number }[];
  splitWith?: string[];
}

interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  invitedEmail: string;
  invitedUid: string;
  senderUid: string;
  senderName: string;
  status: 'pending' | 'accepted' | 'denied';
  createdAt: any;
}

interface MemberProfile {
  uid: string;
  displayName: string;
  email?: string;
}

interface GroupBalanceSummary {
  totalOwed: number;
  totalOwe: number;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Form states
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseParticipants, setExpenseParticipants] = useState<string[]>([]);
  const [expenseError, setExpenseError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, MemberProfile>>({});

  // Fetch groups
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(groupsData);
      
      // Update selected group if it changed
      if (selectedGroup) {
        const updated = groupsData.find(g => g.id === selectedGroup.id);
        if (updated) setSelectedGroup(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });

    return () => unsubscribe();
  }, [user, selectedGroup?.id]);

  // Fetch invitations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'invitations'),
      where('invitedUid', '==', user.uid),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invitation[];
      setInvitations(invData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch expenses when group selected
  useEffect(() => {
    if (!selectedGroup) {
      setExpenses([]);
      return;
    }

    const q = query(
      collection(db, 'groups', selectedGroup.id, 'expenses'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expensesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `groups/${selectedGroup.id}/expenses`);
    });

    return () => unsubscribe();
  }, [selectedGroup?.id]);

  useEffect(() => {
    if (!selectedGroup) {
      setMemberProfiles({});
      return;
    }

    let isMounted = true;

    const loadMemberProfiles = async () => {
      const entries = await Promise.all(
        selectedGroup.members.map(async (memberId) => {
          try {
            const memberSnapshot = await getDoc(doc(db, 'users', memberId));

            if (memberSnapshot.exists()) {
              const data = memberSnapshot.data();
              return [memberId, {
                uid: memberId,
                displayName: data.displayName || data.email || 'Group member',
                email: data.email,
              }] as const;
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${memberId}`);
          }

          return [memberId, {
            uid: memberId,
            displayName: memberId === user?.uid ? 'You' : 'Group member',
          }] as const;
        })
      );

      if (isMounted) {
        setMemberProfiles(Object.fromEntries(entries));
      }
    };

    loadMemberProfiles();

    return () => {
      isMounted = false;
    };
  }, [selectedGroup?.id, user?.uid]);

  useEffect(() => {
    if (!selectedGroup) {
      setExpenseParticipants([]);
      return;
    }

    if (isAddExpenseOpen) {
      setExpenseParticipants(selectedGroup.members);
      setExpenseError('');
    }
  }, [selectedGroup?.id, selectedGroup?.members, isAddExpenseOpen]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        description: newGroupDesc,
        members: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreateGroupOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !inviteEmail.trim()) return;

    setInviteLoading(true);
    setInviteError('');

    try {
      // 1. Find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', inviteEmail.trim().toLowerCase()));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return;
      }

      if (querySnapshot.empty) {
        setInviteError('User not found. They must sign in to Barter first.');
        setInviteLoading(false);
        return;
      }

      const invitedUser = querySnapshot.docs[0].data();
      const invitedUid = invitedUser.uid;

      if (selectedGroup.members.includes(invitedUid)) {
        setInviteError('User is already a member of this group.');
        setInviteLoading(false);
        return;
      }

      // Check if invitation already exists
      const invitationId = `${selectedGroup.id}_${invitedUid}`;
      const invRef = doc(db, 'invitations', invitationId);
      
      let invSnapshot;
      try {
        invSnapshot = await getDoc(invRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `invitations/${invitationId}`);
        return;
      }

      if (invSnapshot.exists() && invSnapshot.data().status === 'pending') {
        setInviteError('An invitation is already pending for this user.');
        setInviteLoading(false);
        return;
      }

      // 2. Create invitation
      try {
        await setDoc(doc(db, 'invitations', invitationId), {
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          invitedEmail: invitedUser.email,
          invitedUid: invitedUid,
          senderUid: user.uid,
          senderName: user.displayName,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'invitations');
        return;
      }

      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error('Invite error:', error);
      setInviteError('Failed to invite member. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    if (!user) return;
    try {
      // 1. Add user to group
      const groupRef = doc(db, 'groups', invitation.groupId);
      try {
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `groups/${invitation.groupId}`);
        return;
      }

      // 2. Delete invitation
      try {
        await deleteDoc(doc(db, 'invitations', invitation.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `invitations/${invitation.id}`);
      }
    } catch (error) {
      console.error('Accept invitation error:', error);
    }
  };

  const handleDenyInvitation = async (invitationId: string) => {
    try {
      await deleteDoc(doc(db, 'invitations', invitationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invitations/${invitationId}`);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !expenseDesc.trim() || !expenseAmount) return;

    const amount = parseFloat(expenseAmount);
    const selectedParticipants = selectedGroup.members.filter(memberId =>
      expenseParticipants.includes(memberId)
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      setExpenseError('Enter a valid amount greater than zero.');
      return;
    }

    if (selectedParticipants.length === 0) {
      setExpenseError('Choose at least one group member to split this expense with.');
      return;
    }

    try {
      await addDoc(collection(db, 'groups', selectedGroup.id, 'expenses'), {
        groupId: selectedGroup.id,
        description: expenseDesc,
        amount: amount,
        paidBy: user.uid,
        splitType: 'equal',
        splits: buildEqualSplits(amount, selectedParticipants),
        splitWith: selectedParticipants,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setExpenseDesc('');
      setExpenseAmount('');
      setExpenseParticipants(selectedGroup.members);
      setExpenseError('');
      setIsAddExpenseOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `groups/${selectedGroup.id}/expenses`);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedGroup) return;
    try {
      await deleteDoc(doc(db, 'groups', selectedGroup.id, 'expenses', expenseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `groups/${selectedGroup.id}/expenses/${expenseId}`);
    }
  };

  const toggleExpenseParticipant = (memberId: string) => {
    setExpenseError('');
    setExpenseParticipants(currentParticipants =>
      currentParticipants.includes(memberId)
        ? currentParticipants.filter(currentId => currentId !== memberId)
        : [...currentParticipants, memberId]
    );
  };

  const getMemberName = (memberId: string) => {
    if (memberId === user?.uid) return 'You';
    return memberProfiles[memberId]?.displayName || memberProfiles[memberId]?.email || 'Group member';
  };

  const getSplitSummary = (expense: Expense) => {
    const participantIds = expense.splitWith?.length
      ? expense.splitWith
      : expense.splits.map(split => split.userId);
    const participantNames = participantIds.map(getMemberName);

    if (participantNames.length === 0) return 'No participants';
    if (participantNames.length === 1) return `Charged entirely to ${participantNames[0]}`;
    if (participantNames.length === 2) return `Split with ${participantNames[0]} and ${participantNames[1]}`;
    return `Split with ${participantNames.slice(0, -1).join(', ')}, and ${participantNames[participantNames.length - 1]}`;
  };

  // Calculate balances for selected group
  const calculateBalances = (): GroupBalanceSummary => {
    if (!user || !selectedGroup) return { totalOwed: 0, totalOwe: 0 };
    
    let totalOwed = 0; // Others owe user
    let totalOwe = 0;  // User owes others

    expenses.forEach(exp => {
      if (exp.paidBy === user.uid) {
        // User paid, others owe user
        exp.splits.forEach(split => {
          if (split.userId !== user.uid) {
            totalOwed += split.amount;
          }
        });
      } else {
        // Someone else paid, user might owe
        const userSplit = exp.splits.find(s => s.userId === user.uid);
        if (userSplit) {
          totalOwe += userSplit.amount;
        }
      }
    });

    return { totalOwed, totalOwe };
  };

  const { totalOwed, totalOwe } = calculateBalances();
  const netBalance = totalOwed - totalOwe;
  const perPersonShare = expenseParticipants.length > 0
    ? formatCurrency(calculatePerPersonShare(expenseAmount, expenseParticipants.length))
    : formatCurrency(0);

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to log out?');

    if (!confirmed) {
      return;
    }

    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src={barterLogo} alt="Barter logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-slate-900">Barter</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Your Groups</h3>
            <button 
              onClick={() => setIsCreateGroupOpen(true)}
              className="p-1 text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                  selectedGroup?.id === group.id 
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-100" 
                    : "bg-white hover:bg-slate-50 text-slate-600 border border-slate-100"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                    selectedGroup?.id === group.id ? "bg-white/20" : "bg-brand-100 text-brand-600"
                  )}>
                    {group.name[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-bold truncate max-w-[120px]">{group.name}</p>
                    <p className={cn(
                      "text-xs",
                      selectedGroup?.id === group.id ? "text-white/70" : "text-slate-400"
                    )}>
                      {group.members.length} members
                    </p>
                  </div>
                </div>
                <ChevronRight className={cn("w-4 h-4", selectedGroup?.id === group.id ? "text-white" : "text-slate-300")} />
              </button>
            ))}
            
            {groups.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 text-sm">No groups yet. Create one to start splitting!</p>
              </div>
            )}
          </div>

          {invitations.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Pending Invitations</h3>
              <div className="space-y-3">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-4 bg-brand-50 rounded-2xl border border-brand-100">
                    <p className="text-sm font-bold text-slate-900 mb-1">{inv.groupName}</p>
                    <p className="text-xs text-slate-500 mb-3">Invited by {inv.senderName}</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptInvitation(inv)}
                        className="flex-1 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleDenyInvitation(inv.id)}
                        className="flex-1 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center space-x-3">
            <img 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{user?.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedGroup ? (
          <>
            {/* Group Header */}
            <header className="bg-white border-b border-slate-200 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">{selectedGroup.name}</h2>
                <p className="text-slate-500">{selectedGroup.description || 'No description'}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Invite Member"
                >
                  <UserPlus className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-100 flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Expense
                </button>
              </div>
            </header>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">You are owed</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalOwed)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">You owe</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOwe)}</p>
                </div>
              </div>
              <div className={cn(
                "p-6 rounded-[2rem] border shadow-sm flex items-center space-x-4",
                netBalance >= 0 ? "bg-brand-50 border-brand-100" : "bg-orange-50 border-orange-100"
              )}>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  netBalance >= 0 ? "bg-brand-100 text-brand-600" : "bg-orange-100 text-orange-600"
                )}>
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Net Balance</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    netBalance >= 0 ? "text-brand-600" : "text-orange-600"
                  )}>
                    {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Expenses List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Expense History</h3>
                </div>
                
                <div className="divide-y divide-slate-50">
                  {expenses.map(expense => {
                    const userShare = expense.splits.find(split => split.userId === user?.uid)?.amount || 0;
                    const expenseStatusLabel = expense.paidBy === user?.uid
                      ? `You lent ${formatCurrency(Math.max(expense.amount - userShare, 0))}`
                      : userShare > 0
                        ? `You owe ${formatCurrency(userShare)}`
                        : 'No share for you';

                    return (
                      <div key={expense.id} className="p-6 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-500">
                              {expense.description[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{expense.description}</p>
                              <p className="text-sm text-slate-500">
                                Paid by {getMemberName(expense.paidBy)} - {expense.date?.toDate().toLocaleDateString()}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{getSplitSummary(expense)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{formatCurrency(expense.amount)}</p>
                              <p className="text-xs text-slate-400">{expenseStatusLabel}</p>
                            </div>
                            <button 
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {expenses.length === 0 && (
                    <div className="text-center py-20">
                      <History className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                      <p className="text-slate-400">No expenses recorded yet.</p>
                      <button 
                        onClick={() => setIsAddExpenseOpen(true)}
                        className="mt-4 text-brand-600 font-bold hover:underline"
                      >
                        Add your first expense
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center">
              <div className="w-24 h-24 bg-brand-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                <Users className="w-12 h-12 text-brand-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to Barter</h2>
              <p className="text-slate-500 mb-10 leading-relaxed">
                Select a group from the sidebar or create a new one to start tracking shared expenses and balances.
              </p>
              <button 
                onClick={() => setIsCreateGroupOpen(true)}
                className="px-8 py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all flex items-center justify-center mx-auto"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New Group
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isCreateGroupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateGroupOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Create New Group</h3>
                <button onClick={() => setIsCreateGroupOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateGroup} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Group Name</label>
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Weekend Trip, Home, Friends"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="What is this group for?"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all h-32 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all"
                >
                  Create Group
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Invite Member</h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleInviteMember} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Member Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  />
                  {inviteError && (
                    <p className="mt-2 text-sm text-red-500 font-medium">{inviteError}</p>
                  )}
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-sm text-blue-700 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    User must already have a Barter account.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {inviteLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Send Invitation'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddExpenseOpen && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddExpenseOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Add Expense</h3>
                <button onClick={() => setIsAddExpenseOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <input
                    type="text"
                    required
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="What did you pay for?"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-slate-700">Split With</label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400">{expenseParticipants.length} selected</span>
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseParticipants(selectedGroup.members);
                          setExpenseError('');
                        }}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseParticipants([]);
                          setExpenseError('');
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selectedGroup.members.map(memberId => {
                      const isSelected = expenseParticipants.includes(memberId);

                      return (
                        <label
                          key={memberId}
                          className={cn(
                            "flex items-center justify-between rounded-2xl border px-4 py-3 cursor-pointer transition-all",
                            isSelected
                              ? "border-brand-200 bg-brand-50"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          )}
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{getMemberName(memberId)}</p>
                            <p className="text-xs text-slate-500">
                              {memberId === user?.uid
                                ? 'Include yourself only if you also used this item'
                                : 'Charge this member for their share'}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleExpenseParticipant(memberId)}
                            className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100">
                  <p className="text-sm text-brand-700 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    {expenseParticipants.length === 1
                      ? 'This expense will be charged fully to 1 selected member'
                      : `Splitting equally among ${expenseParticipants.length} selected members`}
                  </p>
                  <p className="mt-2 text-xs text-brand-600">
                    {expenseParticipants.length > 0
                      ? `${perPersonShare} per selected member. Leave yourself unchecked if you paid for something only someone else used.`
                      : 'Choose at least one member. Leave yourself unchecked if you paid for something only someone else used.'}
                  </p>
                </div>
                {expenseError && (
                  <p className="text-sm text-red-500 font-medium">{expenseError}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-700 transition-all"
                >
                  Add Expense
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildEqualSplits(totalAmount: number, participantIds: string[]) {
  const totalCents = Math.round(totalAmount * 100);
  const baseShare = Math.floor(totalCents / participantIds.length);
  const remainder = totalCents % participantIds.length;

  return participantIds.map((userId, index) => ({
    userId,
    amount: (baseShare + (index < remainder ? 1 : 0)) / 100,
  }));
}

function calculatePerPersonShare(amount: string, participantCount: number) {
  const parsedAmount = Number.parseFloat(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || participantCount <= 0) {
    return 0;
  }

  return parsedAmount / participantCount;
}
