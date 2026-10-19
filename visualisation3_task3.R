library(dplyr)


clean_data <- readRDS("clean_data.rds")
nodes <- clean_data$nodes
links <- clean_data$links

creation_types <- c("PerformerOf", "ComposerOf", "LyricistOf", "ProducerOf")
influence_types <- c("InterpolatesFrom", "DirectlySamples", "InStyleOf", "CoverOf", "LyricalReferenceTo")

target_artists <- c("Sailor Shift", "Kimberly Snyder", "Jay Walters")


artists <- nodes %>% filter(name %in% target_artists & `Node Type` %in% c("Person", "MusicalGroup"))


artist_songs <- links %>%
  filter(source %in% artists$id & `Edge Type` %in% creation_types) %>%
  select(artist_id = source, song_id = target) %>%
  distinct() %>%
 
  left_join(nodes %>% select(id, song_name = name, release_date, notable), by = c("song_id" = "id")) %>%
  mutate(release_date = as.numeric(release_date)) %>%
  filter(!is.na(release_date))


debut_years <- artist_songs %>%
  group_by(artist_id) %>%
  summarise(Debut_Year = min(release_date))


yearly_releases <- artist_songs %>%
  group_by(artist_id, release_date) %>%
  summarise(
    Songs_Released_This_Year = paste(song_name, collapse = ", "),
    New_Notable_Hits = sum(notable == TRUE, na.rm = TRUE),
    .groups = "drop"
  )


target_lookup <- bind_rows(
  data.frame(target_id = artists$id, center_artist_id = artists$id), # If influence points directly to the Artist
  artist_songs %>% select(target_id = song_id, center_artist_id = artist_id) # If influence points to their song
)


incoming_influence <- links %>%
  filter(`Edge Type` %in% influence_types) %>%
  inner_join(target_lookup, by = c("target" = "target_id"))

source_nodes <- nodes %>% filter(id %in% incoming_influence$source)

proxy_dates <- links %>%
  filter(source %in% source_nodes$id & `Edge Type` %in% creation_types) %>%
  left_join(nodes %>% select(id, release_date), by = c("target" = "id")) %>%
  mutate(release_date = as.numeric(release_date)) %>%
  filter(!is.na(release_date)) %>%
  group_by(source) %>%
  summarise(proxy_date = min(release_date))


influence_timeline <- incoming_influence %>%
  left_join(nodes %>% select(id, raw_date = release_date), by = c("source" = "id")) %>%
  mutate(raw_date = as.numeric(raw_date)) %>%
  left_join(proxy_dates, by = "source") %>%
  mutate(Influence_Year = coalesce(raw_date, proxy_date)) %>%
  filter(!is.na(Influence_Year)) %>%
  
  group_by(center_artist_id, Influence_Year) %>%
  summarise(New_Influence_Edges = n(), .groups = "drop")


master_timeline <- artists %>%
  select(artist_id = id, Artist_Name = name) %>%
  left_join(debut_years, by = "artist_id") %>%
  
  group_by(artist_id, Artist_Name, Debut_Year) %>%
  reframe(Absolute_Year = seq(Debut_Year, 2045)) %>%
  
  
  left_join(yearly_releases, by = c("artist_id", "Absolute_Year" = "release_date")) %>%
  
  
  left_join(influence_timeline, by = c("artist_id" = "center_artist_id", "Absolute_Year" = "Influence_Year")) %>%
  
  mutate(
    New_Notable_Hits = coalesce(New_Notable_Hits, 0),
    New_Influence_Edges = coalesce(New_Influence_Edges, 0),
    Songs_Released_This_Year = coalesce(Songs_Released_This_Year, "No releases")
  ) %>%
  
  
  group_by(artist_id) %>%
  arrange(Absolute_Year) %>%
  mutate(
    Years_Since_Debut = Absolute_Year - Debut_Year,
    Cumulative_Notable_Hits = cumsum(New_Notable_Hits),
    Cumulative_Influence = cumsum(New_Influence_Edges)
  ) %>%
  ungroup() %>%
  
  select(
    Artist_Name,
    Absolute_Year,
    Years_Since_Debut,
    New_Influence_Edges,
    Cumulative_Influence,
    New_Notable_Hits,
    Cumulative_Notable_Hits,
    Songs_Released_This_Year
  )


write.csv(master_timeline, "line_chart_data.csv", row.names = FALSE)
print("Success! Upload 'line_chart_data.csv' to Observable.")