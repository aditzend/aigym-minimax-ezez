import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Calendar, 
  Tag, 
  Activity, 
  BookOpen, 
  MessageSquare, 
  TrendingUp,
  Clock,
  CheckCircle,
  PlayCircle,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type TabType = 'overview' | 'content' | 'courses';

interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  last_active: string;
  created_at: string;
  client: {
    id: string;
    name: string;
    logo_url: string;
    brand_color: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface ActivityData {
  date: string;
  score: number;
  activities: number;
}

interface ContentMastery {
  id: string;
  content_item: {
    title: string;
    content_type: string;
    thumbnail_url: string;
  };
  practiced_at: string;
  completion_score: number;
}

interface CourseProgress {
  id: string;
  course_title: string;
  progress_percentage: number;
  lessons_completed: number;
  total_lessons: number;
  last_accessed: string;
}


const UserDetailReport: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Tab-specific data
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [contentMastery, setContentMastery] = useState<ContentMastery[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  
  const [overviewStats, setOverviewStats] = useState({
    totalActivities: 0,
    contentCompleted: 0,
    avgScore: 0,
    streakDays: 0,
    totalTimeSpent: 0
  });

  const loadUserDetails = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          clients!inner(
            id,
            name,
            logo_url,
            brand_color
          ),
          user_tag_assignments(
            user_tags(
              id,
              name,
              color
            )
          )
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('User not found');
      
      const userDetails: UserDetails = {
        ...data,
        client: data.clients,
        tags: data.user_tag_assignments?.map((assignment: any) => assignment.user_tags) || []
      };
      
      setUser(userDetails);
      await loadOverviewData(userId, userDetails.client.id);
    } catch (error) {
      console.error('Error loading user:', error);
      navigate('/communities');
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  const loadOverviewData = async (userId: string, clientId: string) => {
    try {
      // Load activity data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activities } = await supabase
        .from('user_activity_log')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });
      
      // Process activity data into chart format
      const activityMap = new Map<string, { score: number, activities: number }>();
      
      activities?.forEach(activity => {
        const date = new Date(activity.created_at).toISOString().split('T')[0];
        const current = activityMap.get(date) || { score: 0, activities: 0 };
        activityMap.set(date, {
          score: current.score + (activity.activity_data?.score || 1),
          activities: current.activities + 1
        });
      });
      
      const chartData = Array.from(activityMap.entries()).map(([date, data]) => ({
        date,
        score: data.score,
        activities: data.activities
      }));
      
      setActivityData(chartData);
      
      // Calculate overview stats
      const totalActivities = activities?.length || 0;
      const avgScore = chartData.length > 0 
        ? chartData.reduce((sum, day) => sum + day.score, 0) / chartData.length 
        : 0;
      
      setOverviewStats({
        totalActivities,
        contentCompleted: Math.floor(totalActivities * 0.7), // Simulated
        avgScore: Math.round(avgScore * 10) / 10,
        streakDays: calculateStreak(chartData),
        totalTimeSpent: Math.floor(totalActivities * 15) // Simulated minutes
      });
      
    } catch (error) {
      console.error('Error loading overview data:', error);
    }
  };

  const loadContentMastery = async () => {
    if (!userId) return;
    
    try {
      // Simulate content mastery data since we don't have a direct table
      const { data: activities } = await supabase
        .from('user_activity_log')
        .select(`
          *,
          content_items(
            id,
            title,
            content_type,
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .eq('activity_type', 'content_completed')
        .order('created_at', { ascending: false })
        .limit(50);
      
      const masteryData = activities?.map(activity => ({
        id: activity.id,
        content_item: activity.content_items || {
          title: 'Content Item',
          content_type: 'document',
          thumbnail_url: null
        },
        practiced_at: activity.created_at,
        completion_score: activity.activity_data?.score || Math.floor(Math.random() * 40) + 60
      })) || [];
      
      setContentMastery(masteryData);
    } catch (error) {
      console.error('Error loading content mastery:', error);
    }
  };

  const loadCourseProgress = async () => {
    if (!userId) return;
    
    try {
      // Simulate course progress data
      const mockCourses: CourseProgress[] = [
        {
          id: '1',
          course_title: 'AI Fundamentals',
          progress_percentage: 75,
          lessons_completed: 6,
          total_lessons: 8,
          last_accessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2', 
          course_title: 'Advanced Prompt Engineering',
          progress_percentage: 45,
          lessons_completed: 9,
          total_lessons: 20,
          last_accessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          course_title: 'Machine Learning Basics',
          progress_percentage: 100,
          lessons_completed: 12,
          total_lessons: 12,
          last_accessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      setCourseProgress(mockCourses);
    } catch (error) {
      console.error('Error loading course progress:', error);
    }
  };


  const calculateStreak = (data: ActivityData[]): number => {
    if (data.length === 0) return 0;
    
    let streak = 0;
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const day of sortedData) {
      if (day.activities > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  useEffect(() => {
    if (activeTab === 'content') {
      loadContentMastery();
    } else if (activeTab === 'courses') {
      loadCourseProgress();
    }
  }, [activeTab, userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_agent':
        return <MessageSquare size={16} className="text-blue-500" />;
      case 'video':
        return <PlayCircle size={16} className="text-red-500" />;
      case 'document':
        return <FileText size={16} className="text-green-500" />;
      default:
        return <BookOpen size={16} className="text-gray-500" />;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{overviewStats.totalActivities}</div>
                <div className="text-sm text-blue-800">Total Activities</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{overviewStats.contentCompleted}</div>
                <div className="text-sm text-green-800">Content Completed</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{overviewStats.avgScore}</div>
                <div className="text-sm text-purple-800">Avg Score</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{overviewStats.streakDays}</div>
                <div className="text-sm text-orange-800">Day Streak</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{overviewStats.totalTimeSpent}m</div>
                <div className="text-sm text-gray-800">Time Spent</div>
              </div>
            </div>

            {/* Activity Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Score (Last 30 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value, name) => [
                        value,
                        name === 'score' ? 'Activity Score' : 'Activities Count'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3B82F6" 
                      strokeWidth={2} 
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              {contentMastery.slice(0, 5).length > 0 ? (
                <div className="space-y-3">
                  {contentMastery.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      {getContentTypeIcon(item.content_item.content_type)}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{item.content_item.title}</div>
                        <div className="text-xs text-gray-500">Completed {formatDateTime(item.practiced_at)}</div>
                      </div>
                      <div className="text-sm font-semibold text-green-600">{item.completion_score}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Content Mastery Log</h3>
              <div className="text-sm text-gray-500">{contentMastery.length} items practiced</div>
            </div>
            
            {contentMastery.length > 0 ? (
              <div className="space-y-3">
                {contentMastery.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {getContentTypeIcon(item.content_item.content_type)}
                      <div>
                        <div className="font-medium text-gray-900">{item.content_item.title}</div>
                        <div className="text-sm text-gray-500">Practiced on {formatDateTime(item.practiced_at)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">{item.completion_score}%</div>
                        <div className="text-xs text-gray-500">Completion</div>
                      </div>
                      {item.completion_score >= 90 && (
                        <CheckCircle size={20} className="text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No content practiced yet</p>
              </div>
            )}
          </div>
        );

      case 'courses':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Course Progress</h3>
              <div className="text-sm text-gray-500">{courseProgress.length} courses enrolled</div>
            </div>
            
            {courseProgress.length > 0 ? (
              <div className="space-y-4">
                {courseProgress.map((course) => (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">{course.course_title}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        course.progress_percentage === 100 
                          ? 'bg-green-100 text-green-800'
                          : course.progress_percentage >= 50
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.progress_percentage}% Complete
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>{course.lessons_completed} of {course.total_lessons} lessons</span>
                        <span>Last accessed {formatDate(course.last_accessed)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                    
                    {course.progress_percentage === 100 && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle size={16} className="mr-2" />
                        <span className="text-sm font-medium">Course Completed!</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">No courses enrolled yet</p>
              </div>
            )}
          </div>
        );


      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <button
          onClick={() => navigate('/communities')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              
              {/* User Avatar and Info */}
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-semibold"
                  style={{ backgroundColor: user.client.brand_color }}
                >
                  {user.first_name.charAt(0).toUpperCase()}{user.last_name.charAt(0).toUpperCase()}
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.first_name} {user.last_name}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail size={16} />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>Joined {formatDate(user.created_at)}</span>
                    </div>
                    {user.last_active && (
                      <div className="flex items-center space-x-1">
                        <Activity size={16} />
                        <span>Active {formatDate(user.last_active)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Client and Tags */}
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      {user.client.logo_url ? (
                        <img src={user.client.logo_url} alt={user.client.name} className="w-6 h-6 rounded-full" />
                      ) : (
                        <div 
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: user.client.brand_color }}
                        />
                      )}
                      <span className="text-sm text-gray-700">{user.client.name}</span>
                    </div>
                    
                    {user.tags.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Tag size={16} className="text-gray-400" />
                        <div className="flex flex-wrap gap-1">
                          {user.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="inline-block px-2 py-1 text-xs text-white rounded-full"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'content', label: 'Content Mastery', icon: BookOpen },
              { id: 'courses', label: 'Course Progress', icon: CheckCircle }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default UserDetailReport;