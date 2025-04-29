import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import UserManagement from '../../components/admin/UserManagement';
import OrganizationSettings from '../../components/admin/OrganizationSettings';
import BranchManagement from '../../components/admin/BranchManagement';

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Administración</h1>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('organization')}
              className={`${
                activeTab === 'organization'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Organización
            </button>
            <button
              onClick={() => setActiveTab('branches')}
              className={`${
                activeTab === 'branches'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Sucursales
            </button>
          </nav>
        </div>
      </div>

      <div>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'organization' && <OrganizationSettings />}
        {activeTab === 'branches' && <BranchManagement />}
      </div>
    </div>
  );
} 