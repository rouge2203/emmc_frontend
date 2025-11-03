const Teams = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Teams</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage your organization's teams
              </p>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Engineering</p>
                      <p className="text-sm text-gray-500">Software development team</p>
                    </div>
                    <div className="text-sm text-gray-500">12 members</div>
                  </div>
                </li>
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Human Resources</p>
                      <p className="text-sm text-gray-500">HR and recruitment team</p>
                    </div>
                    <div className="text-sm text-gray-500">8 members</div>
                  </div>
                </li>
                <li className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Customer Success</p>
                      <p className="text-sm text-gray-500">Customer support and success</p>
                    </div>
                    <div className="text-sm text-gray-500">15 members</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;

