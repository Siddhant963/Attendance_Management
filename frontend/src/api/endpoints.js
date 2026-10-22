import { baseApi } from './baseApi.js';

const all = ['Current', 'Attendance', 'Overtime', 'Summary', 'Report'];

export const api = baseApi.injectEndpoints({
  endpoints: (b) => ({
    // Auth
    login: b.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    signup: b.mutation({ query: (body) => ({ url: '/auth/signup', method: 'POST', body }) }),
    getMe: b.query({ query: () => '/auth/me' }),

    // Attendance
    getCurrent: b.query({ query: () => '/attendance/current', providesTags: ['Current'] }),
    punchIn: b.mutation({
      query: (body) => ({ url: '/attendance/punch-in', method: 'POST', body }),
      invalidatesTags: all,
    }),
    punchOut: b.mutation({
      query: (body) => ({ url: '/attendance/punch-out', method: 'POST', body }),
      invalidatesTags: all,
    }),
    getMyAttendance: b.query({
      query: (params) => ({ url: '/attendance/me', params }),
      providesTags: ['Attendance'],
    }),
    getTeamAttendance: b.query({
      query: (params) => ({ url: '/attendance', params }),
      providesTags: ['Attendance'],
    }),
    verifyAttendance: b.mutation({
      query: ({ id, ...body }) => ({ url: `/attendance/${id}/verification`, method: 'PATCH', body }),
      invalidatesTags: ['Attendance', 'Summary', 'Report'],
    }),

    // Overtime
    requestOvertime: b.mutation({
      query: (body) => ({ url: '/overtime', method: 'POST', body }),
      invalidatesTags: ['Overtime', 'Attendance', 'Summary', 'Report'],
    }),
    getMyOvertime: b.query({ query: (params) => ({ url: '/overtime/me', params }), providesTags: ['Overtime'] }),
    getOvertimeQueue: b.query({ query: (params) => ({ url: '/overtime', params }), providesTags: ['Overtime'] }),
    decideOvertime: b.mutation({
      query: ({ id, ...body }) => ({ url: `/overtime/${id}/decision`, method: 'PATCH', body }),
      invalidatesTags: ['Overtime', 'Attendance', 'Summary', 'Report'],
    }),

    // Users
    getUsers: b.query({ query: (params) => ({ url: '/users', params }), providesTags: ['Users'] }),
    getUserOptions: b.query({ query: () => '/users/options', providesTags: ['Users'] }),
    getManagers: b.query({ query: () => '/users/managers', providesTags: ['Users'] }),
    updateUser: b.mutation({
      query: ({ id, ...body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Users', 'Summary'],
    }),

    // Reports & dashboard
    getDailyReport: b.query({ query: (params) => ({ url: '/reports/daily', params }), providesTags: ['Report'] }),
    getSummary: b.query({ query: () => '/dashboard/summary', providesTags: ['Summary'] }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useGetMeQuery,
  useGetCurrentQuery,
  usePunchInMutation,
  usePunchOutMutation,
  useGetMyAttendanceQuery,
  useGetTeamAttendanceQuery,
  useVerifyAttendanceMutation,
  useRequestOvertimeMutation,
  useGetMyOvertimeQuery,
  useGetOvertimeQueueQuery,
  useDecideOvertimeMutation,
  useGetUsersQuery,
  useGetUserOptionsQuery,
  useGetManagersQuery,
  useUpdateUserMutation,
  useGetDailyReportQuery,
  useGetSummaryQuery,
} = api;
