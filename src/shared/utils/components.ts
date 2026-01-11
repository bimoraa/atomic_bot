// - Discord component v2 builder utilities - \\

export enum component_type {
  action_row = 1,
  button = 2,
  string_select = 3,
  text_input = 4,
  user_select = 5,
  role_select = 6,
  mentionable_select = 7,
  channel_select = 8,
  section = 9,
  text = 10,
  thumbnail = 11,
  media_gallery = 12,
  file = 13,
  divider = 14,
  separator = 14,
  content_inventory_entry = 16,
  container = 17,
}

export enum button_style {
  primary = 1,
  secondary = 2,
  success = 3,
  danger = 4,
  link = 5,
}

export interface button_component {
  type: number
  style: number
  label: string
  custom_id?: string
  url?: string
  emoji?: { id?: string; name: string }
  disabled?: boolean
}

export interface action_row_component {
  type: number
  components: button_component[] | select_menu_component[]
}

export interface select_option {
  label: string
  value: string
  description?: string
  emoji?: { id?: string; name: string }
  default?: boolean
}

export interface select_menu_component {
  type: number
  custom_id: string
  placeholder?: string
  options?: select_option[]
  min_values?: number
  max_values?: number
}

export interface thumbnail_component {
  type: number
  media: { url: string }
}

export interface text_component {
  type: number
  content: string
}

export interface section_component {
  type: number
  components: text_component[]
  accessory?: thumbnail_component | button_component
}

export interface divider_component {
  type: number
  spacing?: number
  divider?: boolean
}

export interface container_component {
  type: number
  components: (section_component | text_component | divider_component | action_row_component)[]
  accent_color?: number | { r: number; g: number; b: number } | null
  spoiler?: boolean
}

export interface message_payload {
  flags?: number
  content?: string
  components: (container_component | text_component | file_component)[]
}

/**
 * @param {string} label - Button label
 * @param {string} custom_id - Custom identifier
 * @param {{ id?: string; name: string }} emoji - Optional emoji
 * @param {boolean} disabled - Whether button is disabled
 * @returns {button_component} Primary styled button
 */
export function primary_button(label: string, custom_id: string, emoji?: { id?: string; name: string }, disabled?: boolean): button_component {
  return {
    type: component_type.button,
    style: button_style.primary,
    label,
    custom_id,
    emoji,
    disabled,
  }
}

/**
 * @param {string} label - Button label
 * @param {string} custom_id - Custom identifier
 * @param {{ id?: string; name: string }} emoji - Optional emoji
 * @param {boolean} disabled - Whether button is disabled
 * @returns {button_component} Secondary styled button
 */
export function secondary_button(label: string, custom_id: string, emoji?: { id?: string; name: string }, disabled?: boolean): button_component {
  return {
    type: component_type.button,
    style: button_style.secondary,
    label,
    custom_id,
    emoji,
    disabled,
  }
}

/**
 * @param {string} label - Button label
 * @param {string} custom_id - Custom identifier
 * @param {{ id?: string; name: string }} emoji - Optional emoji
 * @param {boolean} disabled - Whether button is disabled
 * @returns {button_component} Success styled button
 */
export function success_button(label: string, custom_id: string, emoji?: { id?: string; name: string }, disabled?: boolean): button_component {
  return {
    type: component_type.button,
    style: button_style.success,
    label,
    custom_id,
    emoji,
    disabled,
  }
}

/**
 * @param {string} label - Button label
 * @param {string} custom_id - Custom identifier
 * @param {{ id?: string; name: string }} emoji - Optional emoji
 * @param {boolean} disabled - Whether button is disabled
 * @returns {button_component} Danger styled button
 */
export function danger_button(label: string, custom_id: string, emoji?: { id?: string; name: string }, disabled?: boolean): button_component {
  return {
    type: component_type.button,
    style: button_style.danger,
    label,
    custom_id,
    emoji,
    disabled,
  }
}

/**
 * @param {string} label - Button label
 * @param {string} url - Link URL
 * @param {{ id?: string; name: string }} emoji - Optional emoji
 * @param {boolean} disabled - Whether button is disabled
 * @returns {button_component} Link styled button
 */
export function link_button(label: string, url: string, emoji?: { id?: string; name: string }, disabled?: boolean): button_component {
  return {
    type: component_type.button,
    style: button_style.link,
    label,
    url,
    emoji,
    disabled,
  }
}

/**
 * - CREATE ACTION ROW - \\
 * 
 * @param {...button_component[]} components - Buttons to include in action row
 * @returns {action_row_component} Action row component
 */
export function action_row(...components: button_component[]): action_row_component {
  return {
    type: component_type.action_row,
    components,
  }
}

/**
 * - CREATE SELECT MENU - \\
 * 
 * @param {string} custom_id - Custom identifier
 * @param {string} placeholder - Placeholder text
 * @param {select_option[]} options - Select options
 * @returns {action_row_component} Select menu in action row
 */
export function select_menu(custom_id: string, placeholder: string, options: select_option[]): action_row_component {
  return {
    type: component_type.action_row,
    components: [
      {
        type: component_type.string_select,
        custom_id,
        placeholder,
        options,
      },
    ],
  }
}

export interface user_select_component {
  type       : number
  custom_id  : string
  placeholder: string
  min_values?: number
  max_values?: number
}

/**
 * - CREATE USER SELECT MENU - \\
 * 
 * @param {string} custom_id - Custom identifier
 * @param {string} placeholder - Placeholder text
 * @returns {action_row_component} User select menu in action row
 */
export function user_select(custom_id: string, placeholder: string): action_row_component {
  return {
    type: component_type.action_row,
    components: [
      {
        type        : component_type.user_select,
        custom_id,
        placeholder,
      },
    ],
  }
}

/**
 * - CREATE THUMBNAIL COMPONENT - \\
 * 
 * @param {string} url - Image URL
 * @returns {thumbnail_component} Thumbnail component
 */
export function thumbnail(url: string): thumbnail_component {
  return {
    type: component_type.thumbnail,
    media: { url },
  }
}

/**
 * - CREATE TEXT COMPONENT - \\
 * 
 * @param {string | string[]} content - Text content
 * @returns {text_component} Text component
 */
export function text(content: string | string[]): text_component {
  return {
    type: component_type.text,
    content: Array.isArray(content) ? content.join("\n") : content,
  }
}

/**
 * - CREATE SECTION COMPONENT - \\
 * Supports accessory as button or thumbnail
 * 
 * @param {object} options - Section options
 * @param {string | string[]} options.content - Section content
 * @param {string} options.thumbnail - Optional thumbnail URL (fallback)
 * @param {string} options.media - Optional media URL (fallback)
 * @param {thumbnail_component | button_component} options.accessory - Optional accessory (button or thumbnail)
 * @returns {section_component} Section component with optional accessory
 * 
 * @example
 * // Section with thumbnail
 * section({ 
 *   content: "Hello World", 
 *   thumbnail: "https://example.com/image.png" 
 * })
 * 
 * @example
 * // Section with button accessory
 * section({ 
 *   content: "Click the button", 
 *   accessory: secondary_button("Click Me", "btn_id") 
 * })
 */
export function section(options: { 
  content: string | string[]; 
  thumbnail?: string; 
  media?: string;
  accessory?: thumbnail_component | button_component;
}): section_component {
  const result: section_component = {
    type       : component_type.section,
    components : [text(options.content)],
  }

  // - HANDLE EXPLICIT ACCESSORY (BUTTON OR MEDIA) - \\
  if (options.accessory) {
    result.accessory = options.accessory
  } 
  // - FALLBACK TO MEDIA/THUMBNAIL - \\
  else {
    const media_url = options.media || options.thumbnail

    if (media_url && typeof media_url === "string" && media_url.trim().length > 0) {
      result.accessory = thumbnail(media_url)
    }
  }

  return result
}

/**
 * - CREATE DIVIDER COMPONENT - \\
 * 
 * @param {number} spacing - Optional spacing (1-4)
 * @returns {divider_component} Divider component
 */
export function divider(spacing?: number): divider_component {
  const result: divider_component = {
    type: component_type.divider,
  }

  if (spacing !== undefined) {
    result.spacing = spacing
  }

  return result
}

/**
 * - CREATE SEPARATOR (ALIAS FOR DIVIDER) - \\
 * 
 * @param {number} spacing - Optional spacing (1-4)
 * @returns {divider_component} Divider component
 */
export function separator(spacing?: number): divider_component {
  return divider(spacing)
}

/**
 * - CREATE CONTAINER COMPONENT - \\
 * 
 * @param {object} options - Container options
 * @param {array} options.components - Components to include in container
 * @param {number | object} options.accent_color - Optional accent color
 * @param {boolean} options.spoiler - Optional spoiler flag
 * @returns {container_component} Container component
 */
export function container(options: {
  components: (section_component | text_component | divider_component | action_row_component)[]
  accent_color?: number | { r: number; g: number; b: number } | null
  spoiler?: boolean
}): container_component {
  let processed_color = options.accent_color

  if (
    options.accent_color &&
    typeof options.accent_color === "object" &&
    "r" in options.accent_color &&
    "g" in options.accent_color &&
    "b" in options.accent_color
  ) {
    processed_color = (options.accent_color.r << 16) | (options.accent_color.g << 8) | options.accent_color.b
  }

  return {
    type        : component_type.container,
    components  : options.components,
    accent_color: processed_color as number | null | undefined,
    spoiler     : options.spoiler,
  }
}

/**
 * - BUILD MESSAGE PAYLOAD - \\
 * 
 * @param {object} options - Message options
 * @param {array} options.components - Message components
 * @param {string} options.content - Optional text content
 * @returns {message_payload} Complete message payload
 */
export function build_message(options: {
  components: (container_component | text_component)[]
  content?: string
}): message_payload {
  return {
    flags: 32768,
    content: options.content,
    components: options.components,
  }
}

/**
 * - CREATE EMOJI OBJECT - \\
 * 
 * @param {string} name - Emoji name
 * @param {string} id - Optional emoji ID for custom emojis
 * @returns {object} Emoji object
 */
export function emoji_object(name: string, id?: string): { id?: string; name: string } {
  return id ? { id, name } : { name }
}

export interface gallery_item {
  media: { url: string }
  description?: string
  spoiler?: boolean
}

export interface media_gallery_component {
  type: number
  items: gallery_item[]
}

/**
 * - CREATE MEDIA GALLERY - \\
 * 
 * @param {gallery_item[]} items - Gallery items
 * @returns {media_gallery_component} Media gallery component
 */
export function media_gallery(items: gallery_item[]): media_gallery_component {
  return {
    type: component_type.media_gallery,
    items,
  }
}

/**
 * - CREATE GALLERY ITEM - \\
 * 
 * @param {string} url - Media URL
 * @param {string} description - Optional description
 * @param {boolean} spoiler - Optional spoiler flag
 * @returns {gallery_item} Gallery item
 */
export function gallery_item(url: string, description?: string, spoiler?: boolean): gallery_item {
  return {
    media: { url },
    description,
    spoiler,
  }
}

/**
 * - CONVERT HEX COLOR TO NUMBER - \\
 * 
 * @param {string} hex - Hex color code (e.g., "#FF0000")
 * @returns {number} Color as number
 */
export function from_hex(hex: string): number {
  const cleaned = hex.replace(/^#/, "")
  return parseInt(cleaned, 16)
}

export interface file_component {
  type: number
  file: { url: string }
}

/**
 * - CREATE FILE COMPONENT - \\
 * 
 * @param {string} url - File URL
 * @returns {file_component} File component
 */
export function file(url: string): file_component {
  return {
    type: component_type.file,
    file: { url },
  }
}
