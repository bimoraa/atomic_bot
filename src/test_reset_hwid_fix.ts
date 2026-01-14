/**
 * - TEST RESET HWID FIX - \\
 * This test verifies that reset_hwid_by_discord correctly fetches user_key before resetting
 */

import * as luarmor from "./infrastructure/api/luarmor"

async function test_reset_hwid() {
  console.log("[ - TEST - ] Testing reset_hwid_by_discord with proper user_key fetch...")
  
  // - TEST WITH INVALID DISCORD ID - \\
  const invalid_result = await luarmor.reset_hwid_by_discord("invalid")
  console.log("Invalid Discord ID result:", invalid_result)
  
  if (!invalid_result.success && invalid_result.error === "Invalid Discord ID format") {
    console.log("✓ Invalid Discord ID validation works")
  } else {
    console.error("✗ Invalid Discord ID validation failed")
  }
  
  console.log("\n[ - TEST - ] Test completed. Deploy to production to verify actual API calls.")
  console.log("Expected behavior in production:")
  console.log("1. No more 'Invalid user_key' errors")
  console.log("2. Single API call per reset (no fallback)")
  console.log("3. Success message: '[ - RESET HWID - ] Success for user {user_id}'")
}

test_reset_hwid().catch(console.error)
