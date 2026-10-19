library(dplyr)

clean_data <- readRDS("clean_data.rds")
nodes <- clean_data$nodes
edges <- clean_data$links


target_artists <- c("Sailor Shift", "Kimberly Snyder", "Jay Walters")

artist_nodes <- nodes %>%
  filter(name %in% target_artists & `Node Type` %in% c("Person", "MusicalGroup")) %>%
  select(artist_id = id, artist_name = name)


works_nodes <- nodes %>%
  filter(`Node Type` %in% c("Song", "Album")) %>%
  select(work_id = id, notable, release_date)

artist_works <- edges %>%
  filter(`Edge Type` %in% c("PerformerOf", "ComposerOf", "ProducerOf", "LyricistOf")) %>%
  inner_join(artist_nodes, by = c("source" = "artist_id")) %>%
  inner_join(works_nodes, by = c("target" = "work_id")) %>%
  # Remove duplicates so we don't double-count a song if they wrote AND performed it
  distinct(artist_name, target, .keep_all = TRUE) 


final_export <- artist_works %>%
  # Make sure the dates are numbers
  mutate(release_year = as.numeric(release_date)) %>%
  
 
  group_by(artist_name) %>%
  mutate(years_since_debut = release_year - min(release_year, na.rm = TRUE)) %>%
  ungroup() %>%
  
  select(artist_name, work_id = target, years_since_debut, notable)

write.csv(final_export, "barchart_data.csv", row.names = FALSE)
print("Success! Upload 'barchart_data.csv' to Observable.")