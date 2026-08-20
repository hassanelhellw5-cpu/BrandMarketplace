import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { API_BASE } from '../config'
import { tokenStore } from '../api/client'

let conn = null
let connected = false
let currentPath = ''

const PAGE_LABELS = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/feed': 'Feed',
  '/explore': 'Explore',
  '/marketplace': 'Marketplace',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/wallet': 'Wallet',
  '/profile': 'My Profile',
  '/profile/edit': 'Edit Profile',
  '/my-bookings': 'My Bookings',
  '/my-castings': 'My Castings',
  '/my-campaigns': 'My Campaigns',
  '/my-events': 'My Events',
  '/my-portfolio': 'My Portfolio',
  '/my-roster': 'My Roster',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/support': 'Support',
  '/tax': 'Tax Reports',
  '/training': 'Training',
  '/assets': 'Assets',
  '/collections': 'Collections',
  '/contracts': 'Contracts',
  '/enterprise': 'Enterprise',
  '/ai-predictions': 'Prediction Lab',
  '/predictions': 'Prediction Lab',
  '/social': 'Social Studio',
  '/plans': 'Plans',
  '/castings': 'Castings',
  '/campaigns': 'Campaigns',
  '/events': 'Events',
  '/community': 'Community',
  '/admin': 'Admin Panel',
  '/login': 'Login',
  '/signup': 'Signup',
}

function getPageLabel(pathname) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  if (pathname.startsWith('/profile/')) return 'Viewing Profile'
  if (pathname.startsWith('/model/')) return 'Viewing Model'
  if (pathname.startsWith('/brand/')) return 'Viewing Brand'
  if (pathname.startsWith('/u/')) return 'Viewing User'
  if (pathname.startsWith('/casting/')) return 'Viewing Casting'
  if (pathname.startsWith('/campaign/')) return 'Viewing Campaign'
  if (pathname.startsWith('/event/')) return 'Viewing Event'
  if (pathname.startsWith('/booking/')) return 'Viewing Booking'
  if (pathname.startsWith('/contract/')) return 'Viewing Contract'
  if (pathname.startsWith('/portfolio/')) return 'Viewing Portfolio'
  if (pathname.startsWith('/post/')) return 'Viewing Post'
  if (pathname.startsWith('/meeting/')) return 'In Meeting'
  return pathname
}

function getPageDetail(pathname) {
  if (pathname.startsWith('/profile/')) return { entity: 'profile', id: pathname.split('/')[2] }
  if (pathname.startsWith('/model/')) return { entity: 'model', id: pathname.split('/')[2] }
  if (pathname.startsWith('/brand/')) return { entity: 'brand', id: pathname.split('/')[2] }
  if (pathname.startsWith('/u/')) return { entity: 'user', id: pathname.split('/')[2] }
  if (pathname.startsWith('/casting/')) return { entity: 'casting', id: pathname.split('/')[2] }
  if (pathname.startsWith('/campaign/')) return { entity: 'campaign', id: pathname.split('/')[2] }
  if (pathname.startsWith('/event/')) return { entity: 'event', id: pathname.split('/')[2] }
  if (pathname.startsWith('/booking/')) return { entity: 'booking', id: pathname.split('/')[2] }
  if (pathname.startsWith('/contract/')) return { entity: 'contract', id: pathname.split('/')[2] }
  if (pathname.startsWith('/portfolio/')) return { entity: 'portfolio', id: pathname.split('/')[2] }
  if (pathname.startsWith('/post/')) return { entity: 'post', id: pathname.split('/')[2] }
  if (pathname.startsWith('/meeting/')) return { entity: 'meeting', id: pathname.split('/')[2] }
  return null
}

function invokeAction(action) {
  if (conn?.state === 'Connected') {
    conn.invoke('ReportAction', action).catch(() => {})
  }
}

export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    const token = tokenStore.getAccess()
    if (!token) return

    if (!conn) {
      conn = new HubConnectionBuilder()
        .withUrl(`${API_BASE.replace(/\/api$/, '')}/hubs/admin-tracking`, { accessTokenFactory: () => tokenStore.getAccess() })
        .withAutomaticReconnect([0, 3, 8, 15, 30])
        .configureLogging(LogLevel.Warning)
        .build()

      conn.start().then(() => {
        connected = true
        const label = getPageLabel(location.pathname)
        const detail = getPageDetail(location.pathname)
        currentPath = location.pathname
        conn.invoke('ReportPage', label, detail).catch(() => {})
      }).catch(() => {})

      conn.onreconnected(() => {
        connected = true
        const label = getPageLabel(currentPath || location.pathname)
        const detail = getPageDetail(currentPath || location.pathname)
        conn.invoke('ReportPage', label, detail).catch(() => {})
      })

      conn.onclose(() => { connected = false })
    } else if (connected && location.pathname !== currentPath) {
      currentPath = location.pathname
      const label = getPageLabel(location.pathname)
      const detail = getPageDetail(location.pathname)
      conn.invoke('ReportPage', label, detail).catch(() => {})
    }
  }, [location.pathname])
}

// ===== VIEW ACTIONS =====
export function reportStoryView(storyId, ownerName) {
  invokeAction({ type: 'view_story', storyId, ownerName })
}

export function reportProductView(productId, productName) {
  invokeAction({ type: 'view_product', productId, productName })
}

export function reportProfileView(userId, displayName, profileType) {
  invokeAction({ type: 'view_profile', targetUserId: userId, displayName, profileType })
}

export function reportCastingView(castingId, castingTitle) {
  invokeAction({ type: 'view_casting', castingId, castingTitle })
}

export function reportCampaignView(campaignId, campaignName) {
  invokeAction({ type: 'view_campaign', campaignId, campaignName })
}

export function reportEventView(eventId, eventName) {
  invokeAction({ type: 'view_event', eventId, eventName })
}

export function reportBookingView(bookingId, bookingTitle) {
  invokeAction({ type: 'view_booking', bookingId, bookingTitle })
}

export function reportPostView(postId, authorName) {
  invokeAction({ type: 'view_post', postId, authorName })
}

export function reportPortfolioView(portfolioId, ownerName) {
  invokeAction({ type: 'view_portfolio', portfolioId, ownerName })
}

export function reportContractView(contractId, contractTitle) {
  invokeAction({ type: 'view_contract', contractId, contractTitle })
}

// ===== APPLY / REGISTER =====
export function reportApplyCasting(castingId, castingTitle) {
  invokeAction({ type: 'apply_casting', castingId, castingTitle })
}

export function reportApplyCampaign(campaignId, campaignName) {
  invokeAction({ type: 'apply_campaign', campaignId, campaignName })
}

export function reportRegisterEvent(eventId, eventName) {
  invokeAction({ type: 'register_event', eventId, eventName })
}

export function reportEnrollCourse(courseId, courseName) {
  invokeAction({ type: 'enroll_course', courseId, courseName })
}

// ===== BOOKING =====
export function reportRequestBooking(bookingId, targetName) {
  invokeAction({ type: 'request_booking', bookingId, targetName })
}

export function reportConfirmBooking(bookingId, projectName) {
  invokeAction({ type: 'confirm_booking', bookingId, projectName })
}

export function reportCancelBooking(bookingId, projectName) {
  invokeAction({ type: 'cancel_booking', bookingId, projectName })
}

export function reportRateBooking(bookingId, projectName, rating) {
  invokeAction({ type: 'rate_booking', bookingId, projectName, rating })
}

// ===== FOLLOW =====
export function reportFollow(targetId, targetName) {
  invokeAction({ type: 'follow', targetId, targetName })
}

export function reportUnfollow(targetId, targetName) {
  invokeAction({ type: 'unfollow', targetId, targetName })
}

// ===== SOCIAL =====
export function reportLikePost(postId, authorName) {
  invokeAction({ type: 'like_post', postId, authorName })
}

export function reportCommentPost(postId, authorName) {
  invokeAction({ type: 'comment_post', postId, authorName })
}

export function reportSharePost(postId, authorName) {
  invokeAction({ type: 'share_post', postId, authorName })
}

export function reportCreatePost(postId) {
  invokeAction({ type: 'create_post', postId })
}

export function reportCreateStory(ownerName) {
  invokeAction({ type: 'create_story', ownerName })
}

// ===== MESSAGE =====
export function reportSendMessage(recipientId, recipientName) {
  invokeAction({ type: 'send_message', recipientId, recipientName })
}

// ===== MARKETPLACE =====
export function reportAddToCart(productId, productName) {
  invokeAction({ type: 'add_to_cart', productId, productName })
}

export function reportPurchase(productId, productName, price) {
  invokeAction({ type: 'purchase', productId, productName, price })
}

// ===== CONTRACT =====
export function reportSignContract(contractId, contractTitle) {
  invokeAction({ type: 'sign_contract', contractId, contractTitle })
}

export function reportGenerateContract(contractId, contractTitle) {
  invokeAction({ type: 'generate_contract', contractId, contractTitle })
}

// ===== WALLET =====
export function reportWithdraw(amount) {
  invokeAction({ type: 'withdraw', amount })
}

export function reportTransfer(recipientName, amount) {
  invokeAction({ type: 'transfer', recipientName, amount })
}

export function reportDeposit(amount) {
  invokeAction({ type: 'deposit', amount })
}

// ===== CREATE / EDIT =====
export function reportCreateCasting(castingId, castingTitle) {
  invokeAction({ type: 'create_casting', castingId, castingTitle })
}

export function reportEditCasting(castingId, castingTitle) {
  invokeAction({ type: 'edit_casting', castingId, castingTitle })
}

export function reportDeleteCasting(castingId, castingTitle) {
  invokeAction({ type: 'delete_casting', castingId, castingTitle })
}

export function reportCreateCampaign(campaignId, campaignName) {
  invokeAction({ type: 'create_campaign', campaignId, campaignName })
}

export function reportEditCampaign(campaignId, campaignName) {
  invokeAction({ type: 'edit_campaign', campaignId, campaignName })
}

export function reportDeleteCampaign(campaignId, campaignName) {
  invokeAction({ type: 'delete_campaign', campaignId, campaignName })
}

export function reportCreateEvent(eventId, eventName) {
  invokeAction({ type: 'create_event', eventId, eventName })
}

export function reportCreateListing(listingId, listingName) {
  invokeAction({ type: 'create_listing', listingId, listingName })
}

export function reportCreatePortfolio(portfolioId, portfolioName) {
  invokeAction({ type: 'create_portfolio', portfolioId, portfolioName })
}

// ===== ACCEPT / REJECT =====
export function reportAcceptApplication(applicationId, context) {
  invokeAction({ type: 'accept_application', applicationId, context })
}

export function reportRejectApplication(applicationId, context) {
  invokeAction({ type: 'reject_application', applicationId, context })
}

// ===== BOOK FROM =====
export function reportBookFromCasting(castingTitle, modelName) {
  invokeAction({ type: 'book_from_casting', castingTitle, modelName })
}

export function reportBookFromCampaign(campaignName, modelName) {
  invokeAction({ type: 'book_from_campaign', campaignName, modelName })
}

// ===== SUBSCRIPTION =====
export function reportSubscribePlan(planName) {
  invokeAction({ type: 'subscribe_plan', planName })
}

export function reportCancelSubscription() {
  invokeAction({ type: 'cancel_subscription' })
}

// ===== SUPPORT =====
export function reportCreateTicket(ticketId, subject) {
  invokeAction({ type: 'create_ticket', ticketId, subject })
}

// ===== REVIEW =====
export function reportWriteReview(targetName, rating) {
  invokeAction({ type: 'write_review', targetName, rating })
}

// ===== BOOST =====
export function reportBoost(targetType, targetName) {
  invokeAction({ type: 'boost', targetType, targetName })
}

// ===== MEETING =====
export function reportJoinMeeting(roomName) {
  invokeAction({ type: 'join_meeting', roomName })
}

// ===== REPORT =====
export function reportReportUser(targetId, targetName, reason) {
  invokeAction({ type: 'report_user', targetId, targetName, reason })
}
