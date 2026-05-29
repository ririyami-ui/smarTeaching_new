import React from 'react';
import { formatDate } from '../../utils/dateUtils';

interface SignatureSectionProps {
  userProfile?: {
    principalName?: string;
    principalNip?: string;
    name?: string;
    nip?: string;
  } | null;
  signingLocation?: string;
}

const SignatureSection: React.FC<SignatureSectionProps> = ({ userProfile, signingLocation }) => {
    const today = formatDate(new Date());

    return (
        <div className="grid grid-cols-2 gap-8 mt-12 print:mt-16 text-sm">
            <div className="text-center">
                <p>Mengetahui,</p>
                <p>Kepala Sekolah</p>
                <div className="mt-16 sm:mt-24">
                    <p className="font-bold underline decoration-1 underline-offset-4 uppercase">{userProfile?.principalName || '................................'}</p>
                    <p>NIP. {userProfile?.principalNip || '................................'}</p>
                </div>
            </div>
            <div className="text-center">
                <p>{signingLocation || '...................'}, {today}</p>
                <p>Guru Mata Pelajaran</p>
                <div className="mt-16 sm:mt-24">
                    <p className="font-bold underline decoration-1 underline-offset-4 uppercase">{userProfile?.name || '................................'}</p>
                    <p>NIP. {userProfile?.nip || '................................'}</p>
                </div>
            </div>
        </div>
    );
};

export default SignatureSection;

